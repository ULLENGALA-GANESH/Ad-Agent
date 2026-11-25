import copy
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

from flask import Flask
import numpy as np

from investigations.api import Console, install
from investigations.benchmark import generate, REPORT
from investigations.detection import groups, metrics
from investigations.inputs import sample_input
from investigations.store import LeaseLost, MAX_ATTEMPTS
from investigations.worker import execute
from investigations.workflow import Investigation


class InvestigationTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.console = Console(Path(self.folder.name) / "jobs.sqlite", workers=0)
        app = Flask(__name__)
        install(app, self.console)
        self.client, self.store = app.test_client(), self.console.open()

    def test_sample_api_and_restart(self):
        response = self.client.post("/api/runs", json={"sample":"elb-requests"})
        self.assertEqual(response.status_code, 202)
        rid = response.json["id"]
        duplicate = self.client.post("/api/runs", json={"sample":"elb-requests"})
        self.assertEqual(duplicate.status_code, 200)
        self.assertEqual(duplicate.json["id"], rid)
        self.assertEqual(self.client.get(f"/api/runs/{rid}/incidents/1").status_code, 409)
        execute(self.store, self.store.claim())
        fresh = Console(self.store.path, workers=0).open()
        result = fresh.run_info(rid)
        self.assertEqual(result["status"], "completed")
        self.assertEqual([s["name"] for s in result["trace"]],
                         ["processor","selector","info","code","review","eval","opt"])
        self.assertTrue(all(s["evidence"] and s["duration_ms"] >= 0 for s in result["trace"]))
        episode = self.client.get(f"/api/runs/{rid}/incidents/1").json["detail"]
        self.assertIn(episode["peak_record"], [p["record"] for p in episode["points"]])
        self.assertEqual(self.client.get(f"/api/runs/{rid}/incidents/0").status_code, 404)
        self.assertEqual(fresh.overview()["total_incidents"], result["summary"]["incidents"])

    def test_import_mapping_and_correlated_logs(self):
        from datetime import datetime, timedelta, timezone
        start = datetime(2024,1,1,tzinfo=timezone.utc)
        stamps = [(start+timedelta(minutes=i)).isoformat() for i in range(120)]
        rows = ["key,when,cpu,ground_truth"] + [
            f"{i},{t},{100 if i in (115,116) else 2},{int(i in (115,116))}" for i,t in enumerate(stamps)]
        raw = "\n".join(rows).encode()
        preview = self.client.post("/api/preview",data={"file":(io.BytesIO(raw),"s.csv")})
        self.assertEqual(preview.json["rows"],120)
        mapping = {"timestamp":"when","label":"ground_truth","features":["cpu"]}
        logs = f"timestamp,message\n{stamps[115]},capacity change\n{stamps[3]},early log".encode()
        response = self.client.post("/api/runs",data={"file":(io.BytesIO(raw),"s.csv"),
            "mapping":json.dumps(mapping),"logs":(io.BytesIO(logs),"events.csv")})
        self.assertEqual(response.status_code,202)
        execute(self.store,self.store.claim())
        detail = self.client.get(f"/api/runs/{response.json['id']}/incidents/1").json["detail"]
        self.assertEqual(detail["count"],2)
        self.assertEqual([l["message"] for l in detail["logs"]],["capacity change"])

    def test_test_labels_and_values_cannot_change_selection(self):
        data=sample_input("exchange-cpm")
        first=Investigation(data).run()
        changed=copy.deepcopy(data)
        cut=first["processor"]["val_end"]
        changed["labels"][cut:]=[1-x for x in data["labels"][cut:]]
        changed["values"][cut:]=[[9000] for _ in changed["values"][cut:]]
        second=Investigation(changed).run()
        for key in ("selected","cutoff","validation","reason"):
            self.assertEqual(first["eval"][key],second["eval"][key])

    def test_tabular_without_labels_has_no_performance_claims(self):
        data=dict(name="table",values=[[0,4]]*119+[[900,4]],features=["a","b"],times=[],labels=None,logs=[])
        out=Investigation(data).run()
        self.assertNotIn("seasonal",out["selector"])
        self.assertNotIn("recall",out["eval"]["heldout"]["robust"])
        self.assertEqual(out["opt"]["incidents"][0]["first_record"],120)

    def test_one_to_one_matches_and_gaps(self):
        times=[0,60,120,180,720]
        scores=np.array([1,0,1,0,1])
        m=metrics(scores,.99,[1,1,1,0,0],times,60)
        self.assertEqual((m["matched"],m["unmatched"],m["reference"]),(1,2,1))
        self.assertEqual(groups([True]*5,times,60),[(0,3),(4,4)])
        self.assertEqual(groups([True,True],[],None),[(0,0),(1,1)])

    def test_rejected_csv_and_unknown_ids(self):
        raw=("time,x,label\n"+"2020-01-01,2,0\n"*100).encode()
        for mapping in ({"timestamp":"time","features":["x","x"]},{"timestamp":"time","features":["x"]},
                        {"label":"label","features":["label"]}):
            res=self.client.post("/api/runs",data={"file":(io.BytesIO(raw),"x.csv"),"mapping":json.dumps(mapping)})
            self.assertEqual(res.status_code,400)
        self.assertEqual(self.client.get("/api/runs/unknown").status_code,404)
        self.assertEqual(self.client.post("/api/runs",json={"sample":"missing"}).status_code,400)
        oversized = {"file": (io.BytesIO(b"a" * 2_000_001), "x.csv")}
        with self.client.post("/api/preview", data=oversized) as response:
            # Werkzeug spools this test client's encoded multipart request to disk.
            self.addCleanup(response.request.input_stream.close)
            self.assertEqual(response.status_code, 413)

    def test_concurrent_idempotency_and_leases(self):
        data=sample_input("ec2-cpu")
        with ThreadPoolExecutor(max_workers=6) as pool:
            results=list(pool.map(lambda _: self.store.submit(data),range(8)))
            claims=list(pool.map(lambda _:self.store.claim(),range(6)))
        self.assertEqual(len({rid for rid,_ in results}),1)
        self.assertEqual(sum(not reused for _,reused in results),1)
        self.assertEqual(sum(c is not None for c in claims),1)

    def test_worker_process_loss_resumes_completed_nodes(self):
        rid,_=self.store.submit(sample_input("ec2-cpu"))
        # The child exits at Evaluator after five real graph checkpoints have committed.
        script = """
import os, sys
from investigations.store import RunStore
from investigations.worker import execute
store=RunStore(sys.argv[1])
begin=store.begin
def crash(claim, stage, description):
    begin(claim,stage,description)
    if stage=='eval':
        os._exit(42)
store.begin=crash
execute(store,store.claim())
"""
        child=subprocess.run([sys.executable,"-c",script,str(self.store.path)],
                             cwd=Path(__file__).resolve().parents[1],timeout=90)
        self.assertEqual(child.returncode,42)
        with self.store.connection(True) as db:
            old_owner=db.execute("SELECT owner FROM runs WHERE id=?",(rid,)).fetchone()[0]
            db.execute("UPDATE runs SET lease=0 WHERE id=?",(rid,))
        claim=self.store.claim()
        with self.assertRaises(LeaseLost):
            self.store.complete((rid,old_owner,1),self.store.load(rid)[1] | {
                "eval":{"selected":"robust","cutoff":.99,"reason":"","heldout":{},"validation":{}},
                "opt":{"incidents":[]}})
        execute(self.store,claim)
        run=self.store.run_info(rid)
        self.assertEqual((run["status"],run["attempt"]),("completed",2))
        self.assertEqual([t["name"] for t in run["trace"] if t["attempt"]==2],["eval","opt"])
        self.assertIn("interrupted",[t["status"] for t in run["trace"]])

    def test_retries_are_bounded(self):
        rid,_=self.store.submit(sample_input("ec2-cpu"))
        for i in range(MAX_ATTEMPTS):
            claim=self.store.claim()
            self.store.fail(claim,"Transient failure",retry=True)
        self.assertIsNone(self.store.claim())
        self.assertEqual(self.store.run_info(rid)["status"],"failed")

    def test_fixed_benchmark_reproduces(self):
        self.assertEqual(generate(),json.loads(REPORT.read_text(encoding="utf-8")))


if __name__=="__main__":
    unittest.main()
