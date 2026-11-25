import os
import sys
import uuid
import json
import threading
import tempfile
import time
import traceback
import webbrowser
from datetime import datetime, timezone

from project_paths import DATA_DIR, PROJECT_ROOT

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Ensure execution under project virtual environment (.venv) if available
venv_py = str(PROJECT_ROOT / ".venv" / "Scripts" / "python.exe")
if __name__ == "__main__" and os.path.exists(venv_py) and os.path.abspath(sys.executable).lower() != venv_py.lower():
    if sys.argv and sys.argv[0].endswith(".py"):
        import subprocess
        sys.exit(subprocess.call([venv_py] + sys.argv))

from flask import Flask, request, jsonify, Response, send_from_directory, abort, after_this_request
from flask_cors import CORS
from werkzeug.utils import secure_filename

from workbench import workbench
from investigations.api import install
from main import recorded_metric


# ============================================================
# Flask App
# ============================================================

app = Flask(__name__)
app.register_blueprint(workbench)
console = install(app)
CORS(
    app,
    resources={r"/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"]}},
    supports_credentials=True,
)


# ============================================================
# Storage & Persistence
# ============================================================

LOG_BUFFERS = {}
RESULTS = {}
JOBS = {}
FEEDBACK_STORE = []
STATE_LOCK = threading.RLock()
STORE_PATH = os.environ.get("AD_AGENT_RESEARCH_STORE", str(DATA_DIR / "jobs_store.json"))


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def load_persistent_store():
    global JOBS, RESULTS, FEEDBACK_STORE
    if os.path.exists(STORE_PATH):
        try:
            with open(STORE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                with STATE_LOCK:
                    JOBS.update(data.get("jobs", {}))
                    RESULTS.update(data.get("results", {}))
                    FEEDBACK_STORE = data.get("feedback", [])
        except Exception as e:
            print(f"[Store] Warning loading store: {e}")


def save_persistent_store(*, strict=False):
    directory = os.path.dirname(os.path.abspath(STORE_PATH))
    temporary = None
    try:
        with STATE_LOCK:
            os.makedirs(directory, exist_ok=True)
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=directory, delete=False) as f:
                temporary = f.name
                json.dump(dict(jobs=JOBS, results=RESULTS, feedback=FEEDBACK_STORE), f, ensure_ascii=False)
                f.flush()
                os.fsync(f.fileno())
            os.replace(temporary, STORE_PATH)
            temporary = None
    except (OSError, ValueError, TypeError) as exc:
        if strict:
            raise
        print(f"[Store] Warning saving store: {exc}")
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)


load_persistent_store()


# ============================================================
# Pipeline Runner
# ============================================================

def run_pipeline(run_id, cmd, train, test):
    """
    Runs the complete agent pipeline in a background thread.
    """
    with STATE_LOCK:
        LOG_BUFFERS[run_id] = []
        JOBS[run_id]["status"] = "running"
        JOBS[run_id]["started_at"] = utc_now()

    def log(msg):
        print(msg)
        with STATE_LOCK:
            LOG_BUFFERS[run_id].append(str(msg))

    try:
        from main import compiled_full_graph, FullToolState
        from agents.agent_processor import AgentProcessor
        from agents.agent_info_miner import AgentInfoMiner
        from agents.agent_code_generator import AgentCodeGenerator
        from agents.agent_reviewer import AgentReviewer
        from agents.agent_evaluator import AgentEvaluator
        from agents.agent_optimizer import AgentOptimizer

        log("PROCESSOR START")
        processor = AgentProcessor()
        cfg = processor.process_command(cmd)

        cfg["dataset_train"] = train or cfg.get("dataset_train")
        if not test or str(test).lower() in ["", "none", "null"]:
            cfg["dataset_test"] = cfg["dataset_train"]
        else:
            cfg["dataset_test"] = test

        log("PROCESSOR DONE")

        state: FullToolState = {
            "messages": [],
            "current_tool": "",
            "input_parameters": {},
            "data_path_train": "",
            "data_path_test": "",
            "package_name": "",

            "agent_info_miner": AgentInfoMiner(),
            "agent_code_generator": AgentCodeGenerator(),
            "agent_reviewer": AgentReviewer(),
            "agent_evaluator": AgentEvaluator(),
            "agent_optimizer": AgentOptimizer(),

            "vectorstore": None,
            "code_quality": None,
            "should_rerun": False,

            "agent_processor": processor,
            "agent_selector": None,
            "experiment_config": cfg,
            "results": None,
            "algorithm_doc": None,
            "log_fn": log,
        }

        log("PIPELINE START")
        final = compiled_full_graph.invoke(state)

        result = final.get("results")
        if not result:
            raise RuntimeError("Pipeline completed without producing results")

        finished_at = utc_now()
        duration_sec = 0.0
        try:
            st = datetime.fromisoformat(JOBS[run_id]["started_at"])
            fi = datetime.fromisoformat(finished_at)
            duration_sec = round((fi - st).total_seconds(), 2)
        except Exception:
            pass

        with STATE_LOCK:
            RESULTS[run_id] = result
            JOBS[run_id].update(
                status="completed",
                finished_at=finished_at,
                duration_seconds=duration_sec,
            )

        log("DONE")
        save_persistent_store()

    except Exception as e:
        error = traceback.format_exc()
        print(error)

        finished_at = utc_now()
        duration_sec = 0.0
        try:
            st = datetime.fromisoformat(JOBS[run_id]["started_at"])
            fi = datetime.fromisoformat(finished_at)
            duration_sec = round((fi - st).total_seconds(), 2)
        except Exception:
            pass

        with STATE_LOCK:
            JOBS[run_id].update(
                status="failed",
                error=str(e),
                finished_at=finished_at,
                duration_seconds=duration_sec,
            )
            LOG_BUFFERS[run_id].append(f"[ERROR] {str(e)}")
            LOG_BUFFERS[run_id].append("FAILED")
            LOG_BUFFERS[run_id].append("DONE")

        save_persistent_store()


# ============================================================
# Core Endpoints
# ============================================================

@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "ad-agent-backend",
        "timestamp": utc_now(),
        "active_jobs": sum(1 for j in JOBS.values() if j.get("status") == "running"),
        "total_jobs": len(JOBS),
    }), 200


@app.post("/upload")
def upload():
    """
    Upload a dataset file.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No filename provided"}), 400

    DATA_DIR.mkdir(exist_ok=True)
    original_name = secure_filename(file.filename)
    if not original_name:
        return jsonify({"error": "Invalid filename"}), 400

    filename = f"{uuid.uuid4().hex}_{original_name}"
    path = str(DATA_DIR / filename)
    file.save(path)

    return jsonify({
        "path": path,
        "filename": original_name,
    }), 200


@app.post("/run")
def run():
    """
    Start the agent pipeline in a background thread.
    """
    if os.getenv("AD_AGENT_TRUSTED_RESEARCH") != "1":
        return jsonify(error="The code-generating research workflow requires a trusted local research session. Use the investigation console for CSV analysis."), 403
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must contain JSON"}), 400

    cmd = data.get("command")
    train = data.get("train_path")
    test = data.get("test_path")

    if not cmd:
        return jsonify({"error": "Missing 'command'"}), 400

    run_id = str(uuid.uuid4())

    with STATE_LOCK:
        JOBS[run_id] = {
            "job_id": run_id,
            "status": "queued",
            "created_at": utc_now(),
            "started_at": None,
            "finished_at": None,
            "duration_seconds": None,
            "command": cmd,
            "train_path": train,
            "test_path": test,
            "error": None,
        }

    thread = threading.Thread(
        target=run_pipeline,
        args=(run_id, cmd, train, test),
        daemon=True,
    )
    thread.start()

    return jsonify({
        "job_id": run_id
    }), 200


@app.get("/logs/<run_id>")
def stream_logs(run_id):
    """
    Stream pipeline logs using Server-Sent Events (SSE).
    """
    with STATE_LOCK:
        if run_id not in JOBS:
            return jsonify({"error": "Experiment job not found", "job_id": run_id}), 404

    def stream():
        last = 0
        while True:
            with STATE_LOCK:
                logs = list(LOG_BUFFERS.get(run_id, []))
                job = JOBS.get(run_id, {})
                job_status = job.get("status")

            if last < len(logs):
                for line in logs[last:]:
                    for subline in str(line).splitlines():
                        yield f"data: {subline}\n"
                    yield "\n"
                last = len(logs)

            # Once job is finished and all logs have been flushed, terminate
            if job_status in {"completed", "failed"} and last >= len(logs):
                if job_status == "completed":
                    yield "data: [COMPLETED]\n\n"
                else:
                    yield "data: [FAILED]\n\n"
                break

            time.sleep(0.3)

    return Response(
        stream(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.get("/results/<run_id>")
def get_results(run_id):
    """
    Return final pipeline results with complete execution metrics and metadata.
    """
    with STATE_LOCK:
        job = JOBS.get(run_id)
        result = research_result(run_id)

    if job is None:
        return jsonify({
            "error": "Experiment job not found",
            "job_id": run_id,
        }), 404

    if job["status"] in {"queued", "running"}:
        return jsonify({
            "error": "Experiment is still processing",
            "job_id": run_id,
            "status": job["status"],
        }), 202

    if job["status"] == "failed":
        return jsonify({
            "error": job.get("error") or "Experiment failed",
            "job_id": run_id,
            "status": "failed",
            "command": job.get("command"),
            "train_path": job.get("train_path"),
            "test_path": job.get("test_path"),
            "created_at": job.get("created_at"),
            "started_at": job.get("started_at"),
            "finished_at": job.get("finished_at"),
            "duration_seconds": job.get("duration_seconds"),
        }), 500

    return jsonify({
        "job_id": run_id,
        "status": "completed",
        "created_at": job.get("created_at"),
        "started_at": job.get("started_at"),
        "finished_at": job.get("finished_at"),
        "duration_seconds": job.get("duration_seconds"),
        "command": job.get("command"),
        "train_path": job.get("train_path"),
        "test_path": job.get("test_path"),
        "independent_test": independent_test(job.get("train_path") or (result or {}).get("dataset_train"),
                                            job.get("test_path") or (result or {}).get("dataset_test")),
        "result": result,
    }), 200


# ============================================================
# Additional Required Endpoints
# ============================================================

def independent_test(train, test):
    return bool(train and test and os.path.normcase(os.path.abspath(train)) != os.path.normcase(os.path.abspath(test)))


def research_result(run_id):
    result = RESULTS.get(run_id)
    if result is None:
        return None
    source = "script-reported" if result.get("metric_source") == "script-reported" else "unverified"
    metrics = result.get("metrics") or {}
    # Older research jobs can contain scores printed by a synthetic or placeholder script.
    # Keep the stored record and raw output available while limiting score fields to sourced values.
    return {**result, "metric_source": source, "metrics": {
        key: recorded_metric(metrics.get(key)) if source == "script-reported" else None
        for key in ("auroc", "auprc")
    }}


@app.get("/experiments")
def list_experiments():
    """
    Return recorded research jobs, newest first.
    """
    items = []
    with STATE_LOCK:
        sorted_jobs = sorted(
            JOBS.values(),
            key=lambda j: j.get("created_at") or "",
            reverse=True,
        )
        for job in sorted_jobs:
            jid = job["job_id"]
            res = research_result(jid) or {}
            metrics = res.get("metrics") or {}
            train_name = os.path.basename(job.get("train_path") or "dataset.csv")

            runtime = "In progress"
            if job.get("duration_seconds") is not None:
                runtime = f"{job['duration_seconds']:.1f}s"

            status_label = "Completed" if job["status"] == "completed" else ("Failed" if job["status"] == "failed" else "Running")

            has_test = independent_test(job.get("train_path") or res.get("dataset_train"),
                                        job.get("test_path") or res.get("dataset_test"))
            eval_mode = "Independent test evaluation" if has_test else "Single-dataset evaluation"

            algo_name = res.get("algorithm") or "Awaiting selection"
            items.append({
                "id": jid,
                "dataset": train_name,
                "model": algo_name,
                "algorithm": algo_name,
                "metric_source": res.get("metric_source"),
                "auroc": round(metrics["auroc"], 4) if metrics.get("auroc") is not None else None,
                "auprc": round(metrics["auprc"], 4) if metrics.get("auprc") is not None else None,
                "runtime": runtime,
                "status": status_label,
                "evaluationMode": eval_mode,
                "date": (job.get("created_at") or utc_now())[:10],
            })

    return jsonify(items), 200


def recorded_benchmarks():
    from investigations.benchmark import REPORT
    return json.loads(REPORT.read_text(encoding="utf-8"))


@app.get("/models")
def list_models():
    report = recorded_benchmarks()
    slug = request.args.get("dataset", "elb-requests")
    case = next((d for d in report["datasets"] if d["id"] == slug), None)
    if case is None:
        return jsonify(error="Unknown benchmark dataset."), 404
    return jsonify([dict(name=report["models"][key], type=key, compatibility=case["name"],
                         auroc=m["auroc"], auprc=m["average_precision"], runtime=None,
                         status="Selected" if key == case["selected"] else "Candidate",
                         source="held-out benchmark", dataset=slug) for key, m in case["metrics"].items()])


@app.get("/benchmarks")
def list_benchmarks():
    rows = []
    for case in recorded_benchmarks()["datasets"]:
        m = case["metrics"][case["selected"]]
        rows.append(dict(name=case["name"], auroc=m["auroc"], auprc=m["average_precision"],
                         regret=None, success=None, failures=None, iterations=None, latency=None, calls=0, cost=0,
                         selected=case["selected"], matched=m["matched"], reference=m["reference"],
                         source="held-out benchmark"))
    return jsonify(rows)


@app.route("/feedback", methods=["GET", "POST"])
def feedback():
    """
    Submit and retrieve human review feedback.
    """
    if request.method == "POST":
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify(error="Provide a research feedback object."), 400
        rid = data.get("job_id")
        action = data.get("action")
        note = data.get("feedback", "")
        model = data.get("model")
        if not isinstance(action, str) or not action.strip() or not isinstance(note, str):
            return jsonify(error="Choose a review action and provide a text note."), 400
        with STATE_LOCK:
            if rid is not None:
                job = JOBS.get(rid) if isinstance(rid, str) else None
                if job is None:
                    return jsonify(error="Research experiment does not exist."), 404
                if job["status"] != "completed":
                    return jsonify(error="Choose a completed research experiment."), 409
                model = (RESULTS.get(rid) or {}).get("algorithm")
            if not isinstance(model, str) or not model.strip():
                return jsonify(error="Choose a model or a completed research experiment."), 400
            entry = dict(id=str(uuid.uuid4()), timestamp=utc_now(), job_id=rid, model=model,
                         action=action.strip(), feedback=note.strip())
            FEEDBACK_STORE.append(entry)
            try:
                save_persistent_store(strict=True)
            except (OSError, ValueError, TypeError):
                FEEDBACK_STORE.pop()
                return jsonify(error="Could not save this review. Your note can be retried."), 503
        return jsonify(status="ok", entry=entry), 201

    with STATE_LOCK:
        return jsonify(FEEDBACK_STORE), 200


# ============================================================
# Start Server
# ============================================================

DIST = PROJECT_ROOT / "frontend" / "dist"


@app.before_request
def serve_browser_navigation():
    aliases = {"/experiments", "/models", "/benchmarks", "/feedback"}
    if request.method not in {"GET", "HEAD"} or request.path not in aliases:
        return

    @after_this_request
    def vary_by_accept(response):
        response.vary.add("Accept")
        return response

    # Fetch and older API clients use */* or omit Accept. Keep JSON as their default.
    if request.accept_mimetypes.best_match(["application/json", "text/html"]) == "text/html":
        return console_page()


@app.get("/")
@app.get("/<path:page>")
def console_page(page=""):
    if page == "favicon.svg" or page.startswith("assets/"):
        return send_from_directory(DIST, page)
    if page.startswith("api/"):
        abort(404)
    if not os.path.isfile(os.path.join(DIST, "index.html")):
        return "Run npm run build in the frontend directory, or use its Vite development server.", 503
    return send_from_directory(DIST, "index.html")


if __name__ == "__main__":
    from urllib.request import ProxyHandler, build_opener
    from werkzeug.serving import make_server

    port = int(os.getenv("AD_AGENT_PORT", "8000"))
    origin = f"http://127.0.0.1:{port}"
    auto_open = "--open" in sys.argv[1:]
    if auto_open:
        try:
            with build_opener(ProxyHandler({})).open(origin + "/api/status", timeout=0.7) as check:
                if json.load(check).get("version", "").startswith("incident-lab-"):
                    webbrowser.open(origin)
                    sys.exit(0)
        except (OSError, ValueError):
            pass
    http = make_server("127.0.0.1", port, app, threaded=True)
    console.open()
    print(f"Ad-Agent is running at {origin}. Press Ctrl+C to stop.", flush=True)
    if auto_open:
        webbrowser.open(origin)
    try:
        http.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        console.stop.set()
        http.server_close()
