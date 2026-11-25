"""HTTP interface to the persistent investigation worker."""
import json
import os
from threading import Event, Lock, Thread

from flask import Blueprint, jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.utils import secure_filename

from main import STAGES
from .benchmark import REPORT
from .inputs import MAX_BYTES, preview, read_logs, read_observations, sample_input
from .store import QueueFull, RunStore
from .worker import DEFAULT_DB, work
from .workflow import VERSION, incident_detail


class Console:
    def __init__(self, filename, workers=1):
        self.filename = filename
        self.workers = workers
        self.store = None
        self.lock = Lock()
        self.stop = Event()
        self.threads = []

    def open(self):
        with self.lock:
            if self.store is None:
                self.store = RunStore(self.filename)
                for number in range(self.workers):
                    thread = Thread(target=work, args=(self.store, self.stop),
                                    name=f"investigation-worker-{number+1}", daemon=True)
                    thread.start()
                    self.threads.append(thread)
        return self.store


def install(app, console=None):
    console = console or Console(os.getenv("AD_AGENT_DB", str(DEFAULT_DB)),
                                 workers=max(0, min(4, int(os.getenv("AD_AGENT_WORKERS", "1")))))
    api = Blueprint("investigation_api", __name__, url_prefix="/api")
    app.extensions["investigations"] = console

    @api.before_request
    def limit_body():
        request.max_content_length = 2 * MAX_BYTES + 100_000

    @api.errorhandler(ValueError)
    def invalid(exc):
        return jsonify(error=str(exc)), 400

    @api.errorhandler(QueueFull)
    def busy(exc):
        return jsonify(error=str(exc)), 429

    @api.errorhandler(RequestEntityTooLarge)
    def too_large(exc):
        return jsonify(error="Upload exceeds the 2 MB limit per CSV."), 413

    def upload(field):
        f = request.files.get(field)
        if f is None:
            raise ValueError(f"Choose a CSV for {field}.")
        raw = f.stream.read(MAX_BYTES+1)
        if len(raw) > MAX_BYTES:
            raise RequestEntityTooLarge()
        return raw

    @api.get("/status")
    def status():
        return jsonify(version=VERSION, trusted_research=os.getenv("AD_AGENT_TRUSTED_RESEARCH") == "1",
                       brief_model=os.getenv("AD_AGENT_OLLAMA_MODEL", "llama3.2:3b"))

    @api.get("/overview")
    def overview():
        offset = max(0, request.args.get("offset", 0, type=int))
        return jsonify(console.open().overview(offset=offset, rid=request.args.get("run")))

    @api.get("/benchmark")
    def benchmark():
        return app.response_class(REPORT.read_bytes(), mimetype="application/json")

    @api.post("/preview")
    def preview_file():
        return jsonify(preview(upload("file")))

    @api.post("/runs")
    def submit():
        if request.is_json:
            body = request.get_json(silent=True)
            if not isinstance(body, dict) or not isinstance(body.get("sample"), str):
                raise ValueError("Choose a sample dataset.")
            want_brief = body.get("local_brief", False)
            if type(want_brief) is not bool:
                raise ValueError("local_brief must be a boolean.")
            data = sample_input(body["sample"])
        else:
            raw = upload("file")
            try:
                mapping = json.loads(request.form.get("mapping", "null"))
            except json.JSONDecodeError as exc:
                raise ValueError("Invalid column mapping.") from exc
            data = read_observations(raw, mapping)
            logs = read_logs(upload("logs")) if "logs" in request.files else []
            if logs and not data["times"]:
                raise ValueError("Choose a timestamp column to correlate event logs.")
            name = secure_filename(request.files["file"].filename or "observations.csv")[:160]
            data.update(name=name or "observations.csv", source=None, logs=logs)
            want_brief = request.form.get("local_brief") == "1"
        if want_brief:
            data["brief_model"] = os.getenv("AD_AGENT_OLLAMA_MODEL", "llama3.2:3b")
            # Keep older tolerance-checked briefs in history and run the exact verifier for new requests.
            data["brief_verification"] = "exact-values-v1"
        rid, cached = console.open().submit(data)
        return jsonify(id=rid, reused=cached), 200 if cached else 202

    @api.get("/runs/<rid>")
    def run_info(rid):
        result = console.open().run_info(rid)
        if result is None:
            return jsonify(error="Run does not exist."), 404
        result["stages"] = [dict(id=key, name=name) for key, name, _ in STAGES]
        return jsonify(result)

    @api.get("/runs/<rid>/incidents/<int:number>")
    def incident(rid, number):
        store = console.open()
        run = store.run_info(rid)
        if run is None:
            return jsonify(error="Run does not exist."), 404
        if run["status"] != "completed":
            return jsonify(error="Run has no completed investigation."), 409
        final = store.output(rid, "opt")
        episodes = final["incidents"]
        if not 1 <= number <= len(episodes):
            return jsonify(error="Incident does not exist."), 404
        detail = incident_detail(episodes[number-1], store.output(rid, "eval"), run["summary"]["profile"])
        brief = final.get("brief")
        if brief and brief["incident"] == number:
            detail["brief"] = brief
        return jsonify(detail=detail, run=dict(id=rid, name=run["name"], source=run["source"]),
                       selected=run["summary"]["selected"], cutoff=run["summary"]["cutoff"])

    app.register_blueprint(api)
    return console
