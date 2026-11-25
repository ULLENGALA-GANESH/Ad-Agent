"""Reproduce the fixed benchmark with the same compiled graph as the console."""
import argparse
import hashlib
import json
from importlib.metadata import version

from .detection import CATALOG
from .inputs import DATA_DIR, SOURCES, sample_input
from .workflow import VERSION, Investigation, incident_detail

REPORT = DATA_DIR / "report.json"


def generate():
    cases = []
    for slug, source in SOURCES.items():
        data = sample_input(slug)
        outputs = Investigation(data).run()
        p, evaluation = outputs["processor"], outputs["eval"]
        incidents = outputs["opt"]["incidents"]
        # Display the largest absolute excursion from the fitting median for this signal.
        example = max(incidents, key=lambda i: abs(i["observed"]-i["expected"]), default=None)
        view = incident_detail(example, evaluation, p) if example else None
        cases.append(dict(id=slug, name=data["name"], url=source["source"], blob=source["blob"],
                          label_blob=source["label_blob"], rows=p["rows"], evaluated=p["rows"]-p["val_end"],
                          selected=evaluation["selected"], reason=evaluation["reason"], cutoff=evaluation["cutoff"],
                          metrics=evaluation["heldout"], validation=evaluation["validation"],
                          file_sha256=hashlib.sha256((DATA_DIR/f"{slug}.csv").read_bytes().replace(b"\r\n", b"\n")).hexdigest(),
                          example=view))
    return dict(version=VERSION, packages={n: version(n) for n in ("scikit-learn", "numpy", "langgraph")},
                models={k: v[0] for k, v in CATALOG.items()}, datasets=cases)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify", action="store_true", help="Compare this execution with the checked-in report.")
    args = parser.parse_args()
    report = generate()
    if args.verify:
        expected = json.loads(REPORT.read_text(encoding="utf-8"))
        if report != expected:
            raise SystemExit("Benchmark differs from the recorded report. Check data, code and package versions.")
    else:
        REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False, allow_nan=False)+"\n", encoding="utf-8")
    for case in report["datasets"]:
        m = case["metrics"][case["selected"]]
        print(f"{case['name']}: {case['selected']} at {case['cutoff']:.1%}, "
              f"{m['matched']}/{m['reference']} events, {m['unmatched']} unmatched incidents")
