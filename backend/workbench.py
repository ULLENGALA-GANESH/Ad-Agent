"""Local novelty detection for ordered numeric CSV data."""
import csv
import io

import numpy as np
from flask import Blueprint, jsonify, request
from sklearn.ensemble import IsolationForest
from sklearn.metrics import average_precision_score, confusion_matrix, roc_auc_score

from project_paths import DATA_DIR

workbench = Blueprint("workbench", __name__)
MAX_BYTES = 2_000_000
DEMO = DATA_DIR / "sensor-demo.csv"


def analyze(stream, alert_rate):
    if not 0.01 <= alert_rate <= 0.20:
        raise ValueError("Alert rate must be between 1% and 20%.")
    reader = csv.reader(stream, strict=True)
    names = [name.strip() for name in next(reader, [])]
    if not names or any(not n for n in names) or len(names) != len(set(names)):
        raise ValueError("Use a header with unique, nonempty column names.")
    features = [i for i, name in enumerate(names) if name not in {"timestamp", "id", "label"}]
    if not 1 <= len(features) <= 32:
        raise ValueError("Provide 1 to 32 numeric features.")
    label_index = names.index("label") if "label" in names else None
    rows, labels = [], []
    for row in reader:
        if not row:
            continue
        if len(rows) >= 10000:
            raise ValueError("CSV exceeds 10,000 records.")
        if len(row) != len(names):
            raise ValueError(f"Wrong column count at line {reader.line_num}.")
        try:
            values = [float(row[i]) for i in features]
        except ValueError as exc:
            raise ValueError(f"Missing or nonnumeric feature at line {reader.line_num}.") from exc
        if any(not np.isfinite(v) or abs(v) > 1e30 for v in values):
            raise ValueError(f"Feature outside supported numeric range at line {reader.line_num}.")
        rows.append(values)
        if label_index is not None:
            if row[label_index].strip() not in {"0", "1"}:
                raise ValueError("Labels must be 0 or 1.")
            labels.append(int(row[label_index]))

    if len(rows) < 100:
        raise ValueError("Provide at least 100 ordered records.")
    data = np.asarray(rows)
    fit_end, split = len(rows) // 2, len(rows) * 3 // 4
    baseline, calibration, holdout = data[:fit_end], data[fit_end:split], data[split:]
    center = np.median(baseline, axis=0)
    mad = np.median(np.abs(baseline - center), axis=0)
    scale = np.where(mad > 0, 1.4826 * mad, np.std(baseline, axis=0))
    # Give constant features a small scale so a change remains visible.
    scale = np.where(scale > 0, scale, np.maximum(1, np.abs(center)) * 1e-8)
    deviations = np.abs((data[fit_end:] - center) / scale)
    forest = IsolationForest(n_estimators=100, random_state=42).fit(baseline)
    raw = [deviations.max(axis=1), -forest.score_samples(data[fit_end:])]
    reports, ranks = {}, []
    for name, scores in zip(("robust_deviation", "isolation_forest"), raw):
        reference = np.sort(scores[:len(calibration)])
        observed = scores[len(calibration):]
        # Strict rank keeps ties at the baseline from becoming false alerts.
        rank = np.searchsorted(reference, observed, side="left") / len(reference)
        ranks.append(rank)
        reports[name] = summarize(rank, labels[split:], alert_rate)
    ensemble = np.mean(ranks, axis=0)
    reports["ensemble"] = summarize(ensemble, labels[split:], alert_rate)
    findings = []
    for j in np.argsort(-ensemble, kind="stable")[:20]:
        d = deviations[len(calibration) + j]
        k = int(np.argmax(d))
        findings.append(dict(record=int(split + j + 1), score=float(ensemble[j]),
                             flagged=bool(ensemble[j] >= 1 - alert_rate),
                             feature=names[features[k]], value=float(holdout[j, k]),
                             baseline=float(center[k]), label=labels[split+j] if labels else None))
    return dict(fit=len(baseline), calibration=len(calibration), evaluated=len(holdout),
                features=[names[i] for i in features], alert_rate=alert_rate,
                models=reports, findings=findings)


def summarize(scores, labels, rate):
    alerts = scores >= 1 - rate
    result = dict(alerts=int(alerts.sum()))
    if labels:
        tn, fp, fn, tp = confusion_matrix(labels, alerts, labels=[0, 1]).ravel()
        result.update(tp=int(tp), fp=int(fp), tn=int(tn), fn=int(fn))
        if len(set(labels)) == 2:
            result.update(roc_auc=float(roc_auc_score(labels, scores)),
                          average_precision=float(average_precision_score(labels, scores)))
    return result


@workbench.post("/workbench/analyze")
def analyze_csv():
    request.max_content_length = MAX_BYTES + 65536
    try:
        rate = float(request.form.get("alert_rate", "0.05"))
        upload = request.files.get("file")
        if upload is not None:
            raw = upload.stream.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                return jsonify(error="CSV exceeds 2 MB."), 413
        elif request.form.get("demo") == "1":
            raw = DEMO.read_bytes()
        else:
            raise ValueError("Choose a CSV or run the built-in demo.")
        return jsonify(analyze(io.StringIO(raw.decode("utf-8-sig"), newline=""), rate))
    except (ValueError, csv.Error) as exc:
        return jsonify(error=str(exc)), 400
