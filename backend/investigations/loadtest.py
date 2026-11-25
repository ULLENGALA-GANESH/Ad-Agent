"""Measure queue-inclusive HTTP latency on independent copies of the ELB trace."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import csv
from datetime import datetime, timezone
import io
import json
import logging
import os
import platform
import tempfile
from pathlib import Path
from threading import Thread
import time

from flask import Flask
import numpy as np
from werkzeug.serving import make_server
import requests

from .api import Console, install
from .inputs import sample_input


def run(count, workers, clients):
    data=sample_input("elb-requests")
    stream=io.StringIO(newline="")
    writer=csv.writer(stream)
    writer.writerow(["time","requests","label"])
    for t, row, y in zip(data["times"],data["values"],data["labels"]):
        writer.writerow([datetime.fromtimestamp(t, timezone.utc).isoformat(),row[0],y])
    raw=stream.getvalue().encode()
    mapping=json.dumps(dict(timestamp="time",features=["requests"],label="label"))
    with tempfile.TemporaryDirectory() as folder:
        app=Flask(__name__)
        console=Console(Path(folder)/"queue.sqlite3",workers)
        install(app,console)
        console.open()
        server=make_server("127.0.0.1",0,app,threaded=True)
        origin=f"http://127.0.0.1:{server.server_port}/api"
        http=Thread(target=server.serve_forever,daemon=True)
        http.start()

        def submit(n):
            start=time.perf_counter()
            with requests.Session() as session:
                session.trust_env=False
                response=session.post(origin+"/runs", files={"file":(f"elb-replay-{n}.csv",raw)},
                                      data={"mapping":mapping},timeout=20)
                response.raise_for_status()
                rid=response.json()["id"]
                while time.perf_counter()-start < 150:
                    response=session.get(origin+"/runs/"+rid,timeout=10)
                    response.raise_for_status()
                    result=response.json()
                    if result["status"]=="completed":
                        return time.perf_counter()-start
                    if result["status"]=="failed":
                        raise RuntimeError(result["error"])
                    time.sleep(.12)
                raise TimeoutError("Run did not finish within 150 seconds.")
        try:
            start=time.perf_counter()
            with ThreadPoolExecutor(max_workers=clients) as pool:
                seconds=list(pool.map(submit,range(count)))
            wall=time.perf_counter()-start
        finally:
            server.shutdown()
            server.server_close()
            http.join()
            console.stop.set()
            for thread in console.threads:
                thread.join()
    return dict(runs=count,workers=workers,clients=clients,records_per_run=len(data["values"]),
                wall_seconds=round(wall,3),throughput_runs_sec=round(count/wall,3),
                p50_seconds=round(float(np.percentile(seconds,50)),3),
                p95_seconds=round(float(np.percentile(seconds,95)),3),
                python=platform.python_version(),system=platform.system(),
                processor=platform.processor(),logical_cpus=os.cpu_count())


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runs",type=int,default=20,choices=range(1,101),metavar="1..100")
    parser.add_argument("--workers",type=int,default=2,choices=range(1,5))
    parser.add_argument("--clients",type=int,default=4,choices=range(1,17))
    args=parser.parse_args()
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    print(json.dumps(run(args.runs,args.workers,args.clients),indent=2))
