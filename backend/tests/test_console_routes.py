import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import server
from investigations.benchmark import REPORT
from main import call_optimizer


class ResearchRoutesTests(unittest.TestCase):
    def setUp(self):
        folder = self.enterContext(tempfile.TemporaryDirectory())
        self.folder = Path(folder)
        self.store = self.folder / "research.json"
        (self.folder / "index.html").write_text("<title>Ad-Agent</title>", encoding="utf-8")
        self.enterContext(patch.multiple(
            server, DIST=folder, STORE_PATH=str(self.store), FEEDBACK_STORE=[],
            JOBS={"done": {"job_id": "done", "status": "completed"},
                  "pending": {"job_id": "pending", "status": "queued"}},
            RESULTS={"done": {"algorithm": "IForest"}},
        ))
        self.client = server.app.test_client()

    def test_direct_navigation_and_fetch_share_the_research_urls(self):
        for path in ("/experiments", "/models", "/benchmarks", "/feedback"):
            for method in ("GET", "HEAD"):
                for accept, mimetype in (
                    ("application/xhtml+xml,text/html;q=0.9,*/*;q=0.8", "text/html"),
                    ("text/html;q=0.1,application/json", "application/json"),
                    ("*/*", "application/json"),
                    (None, "application/json"),
                ):
                    with self.subTest(path=path, method=method, accept=accept):
                        headers = {"Accept": accept} if accept else {}
                        with self.client.open(path, method=method, headers=headers) as response:
                            self.assertEqual(response.status_code, 200)
                            self.assertEqual(response.mimetype, mimetype)
                            self.assertIn("Accept", response.vary)
                            if method == "GET" and mimetype == "text/html":
                                self.assertIn(b"<title>Ad-Agent</title>", response.data)

    def test_legacy_model_and_benchmark_apis_reflect_the_heldout_report(self):
        cases = json.loads(REPORT.read_text(encoding="utf-8"))["datasets"]
        rows = {row["name"]: row for row in self.client.get("/benchmarks").json}
        self.assertEqual(set(rows), {case["name"] for case in cases})
        for case in cases:
            row = rows[case["name"]]
            selected = case["metrics"][case["selected"]]
            self.assertEqual((row["auroc"], row["auprc"]), (selected["auroc"], selected["average_precision"]))
            models = self.client.get("/models", query_string={"dataset": case["id"]}).json
            self.assertEqual({m["type"] for m in models}, set(case["metrics"]))
            for model in models:
                metrics = case["metrics"][model["type"]]
                self.assertEqual((model["auroc"], model["auprc"]), (metrics["auroc"], metrics["average_precision"]))
        self.assertEqual(self.client.get("/models?dataset=unknown").status_code, 404)

    def test_historical_research_scores_have_no_provenance(self):
        raw = {"auroc": 0.91, "auprc": 0.76}
        server.RESULTS["done"].update(metrics=raw, std_output="Original transcript", code="# Original script")
        result = self.client.get("/results/done").json["result"]
        row = next(item for item in self.client.get("/experiments").json if item["id"] == "done")
        self.assertEqual((result["metric_source"], row["metric_source"]), ("unverified", "unverified"))
        self.assertEqual(result["metrics"], {"auroc": None, "auprc": None})
        self.assertEqual((row["auroc"], row["auprc"]), (None, None))
        self.assertEqual((result["std_output"], result["code"]), ("Original transcript", "# Original script"))
        self.assertEqual(server.RESULTS["done"]["metrics"], {"auroc": 0.91, "auprc": 0.76})

    def test_current_research_scores_identify_their_source(self):
        state = call_optimizer({
            "current_tool": "IForest", "log_fn": lambda msg: None,
            "code_quality": SimpleNamespace(auroc=0.0, auprc=-1),
            "data_path_train": "train.csv", "data_path_test": "test.csv", "input_parameters": {},
        })
        server.RESULTS["done"] = state["results"]
        detail = self.client.get("/results/done").json
        row = next(item for item in self.client.get("/experiments").json if item["id"] == "done")
        self.assertTrue(detail["independent_test"])
        self.assertEqual((detail["result"]["metric_source"], row["metric_source"]), ("script-reported", "script-reported"))
        self.assertEqual(detail["result"]["metrics"], {"auroc": 0.0, "auprc": None})
        self.assertEqual((row["auroc"], row["auprc"]), (0.0, None))

    def test_completed_experiment_review_survives_reload(self):
        review = {"job_id": "done", "model": "client-supplied", "action": "Approve", "feedback": "Ready"}
        saved = self.client.post("/feedback", json=review)
        self.assertEqual(saved.status_code, 201)
        entry = saved.json["entry"]
        self.assertEqual((entry["job_id"], entry["model"], entry["feedback"]), ("done", "IForest", "Ready"))
        server.FEEDBACK_STORE.clear()
        server.load_persistent_store()
        self.assertEqual(self.client.get("/feedback").json, [entry])

    def test_failed_write_preserves_previous_reviews_and_allows_retry(self):
        review = {"job_id": "done", "action": "Approve", "feedback": "First review"}
        first = self.client.post("/feedback", json=review).json["entry"]
        before = self.store.read_bytes()
        review["feedback"] = "Second review"
        with patch.object(server.os, "replace", side_effect=OSError("simulated write failure")):
            self.assertEqual(self.client.post("/feedback", json=review).status_code, 503)
        self.assertEqual(self.store.read_bytes(), before)
        self.assertEqual(self.client.get("/feedback").json, [first])
        retried = self.client.post("/feedback", json=review)
        self.assertEqual(retried.status_code, 201)
        self.assertEqual(json.loads(self.store.read_bytes())["feedback"], [first, retried.json["entry"]])

    def test_feedback_rejects_invalid_or_incomplete_experiments(self):
        for job_id, expected in (("missing", 404), ("pending", 409)):
            with self.subTest(job_id=job_id):
                response = self.client.post("/feedback", json={
                    "job_id": job_id, "model": "ignored", "action": "Approve"
                })
                self.assertEqual(response.status_code, expected)
        self.assertEqual(self.client.post("/feedback", json={"job_id": "done", "action": ""}).status_code, 400)
        self.assertEqual(self.client.get("/feedback").json, [])
        self.assertFalse(self.store.exists())


if __name__ == "__main__":
    unittest.main()
