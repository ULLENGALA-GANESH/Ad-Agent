"""Validate CSV mappings and prepare ordered observations for the graph."""
import csv
import io
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "benchmarks"
MAX_BYTES = 2_000_000
MAX_ROWS = 10_000
SOURCES = {item["id"]: item for item in json.loads((DATA_DIR / "sources.json").read_text())}


def table(raw, *, minimum=1):
    if len(raw) > MAX_BYTES:
        raise ValueError("CSV exceeds 2 MB.")
    try:
        reader = csv.reader(io.StringIO(raw.decode("utf-8-sig"), newline=""), strict=True)
        header = [cell.strip() for cell in next(reader, [])]
        if (not 1 <= len(header) <= 64 or any(not h or len(h) > 100 for h in header)
                or len(header) != len(set(header))):
            raise ValueError("Use 1–64 unique, nonempty column names of at most 100 characters.")
        rows = []
        for row in reader:
            if not row:
                continue
            if len(row) != len(header):
                raise ValueError(f"Column count differs at line {reader.line_num}.")
            if len(rows) >= MAX_ROWS:
                raise ValueError("CSV exceeds 10,000 records.")
            rows.append(row)
    except (UnicodeDecodeError, csv.Error) as exc:
        raise ValueError("Use a valid UTF-8 CSV with a header.") from exc
    if len(rows) < minimum:
        raise ValueError(f"Provide at least {minimum} records.")
    return header, rows


def epoch(cell):
    # Offset-free ISO times are UTC across machines and daylight-saving settings.
    try:
        dt = datetime.fromisoformat(cell.strip().replace("Z", "+00:00"))
        return (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)).timestamp()
    except (ValueError, OverflowError, OSError) as exc:
        raise ValueError("Use ISO timestamps, for example 2025-01-02T14:30:00Z.") from exc


def numeric(cell):
    try:
        value = float(cell)
    except ValueError as exc:
        raise ValueError("Missing or nonnumeric feature") from exc
    if not np.isfinite(value) or abs(value) > 1e30:
        raise ValueError("Feature outside the finite numeric range")
    return value


def preview(raw):
    names, rows = table(raw, minimum=100)
    sample = rows[:32]
    timestamp = next((n for n in names if n.lower() in {"timestamp", "time", "datetime", "date"}), None)
    label = next((n for n in names if n.lower() in {"label", "is_anomaly", "anomaly"}), None)
    features = []
    for index, name in enumerate(names):
        if name in (label, timestamp) or name.lower() in {"id", "index", "row_id"}:
            continue
        try:
            for row in sample:
                numeric(row[index])
        except ValueError:
            continue
        features.append(name)
    return dict(columns=names, sample=rows[:4], rows=len(rows),
                mapping=dict(timestamp=timestamp, label=label, features=features[:32]))


def read_observations(raw, mapping):
    names, rows = table(raw, minimum=100)
    if not isinstance(mapping, dict):
        raise ValueError("Supply a column mapping.")
    features = mapping.get("features")
    timestamp, label = mapping.get("timestamp"), mapping.get("label")
    if not isinstance(features, list) or not 1 <= len(features) <= 32:
        raise ValueError("Choose between 1 and 32 signal columns.")
    roles = features + [x for x in (timestamp, label) if x is not None]
    if any(not isinstance(r, str) or r not in names for r in roles) or len(set(roles)) != len(roles):
        raise ValueError("Each role must use a separate, existing column.")
    indices = [names.index(n) for n in features]
    ti = names.index(timestamp) if timestamp is not None else None
    li = names.index(label) if label is not None else None
    values, times, labels = [], [], []
    for i, row in enumerate(rows, start=1):
        try:
            values.append([numeric(row[j]) for j in indices])
            if ti is not None:
                stamp = epoch(row[ti])
                if times and stamp <= times[-1]:
                    raise ValueError("Timestamps must increase strictly")
                times.append(stamp)
            if li is not None:
                val = row[li].strip()
                if val not in {"0", "1"}:
                    raise ValueError("Labels must be 0 or 1")
                labels.append(int(val))
        except ValueError as exc:
            raise ValueError(f"{exc} (record {i}).") from exc
    return dict(features=features, values=values, times=times, labels=labels if li is not None else None)


def read_logs(raw):
    header, rows = table(raw)
    if "timestamp" not in header or "message" not in header or len(rows) > 5000:
        raise ValueError("Logs need timestamp and message columns and at most 5,000 entries.")
    ti, mi = header.index("timestamp"), header.index("message")
    logs = []
    for n, row in enumerate(rows, start=1):
        if not row[mi].strip() or len(row[mi]) > 1000:
            raise ValueError(f"Log message {n} must contain 1–1,000 characters.")
        logs.append(dict(time=epoch(row[ti]), message=row[mi]))
    return sorted(logs, key=lambda l: l["time"])


def sample_input(slug):
    item = SOURCES.get(slug)
    if item is None:
        raise ValueError("Unknown sample dataset.")
    raw = (DATA_DIR / f"{slug}.csv").read_bytes()
    data = read_observations(raw, dict(timestamp="timestamp", features=["value"]))
    windows = [(epoch(start), epoch(end)) for start, end in item["windows"]]
    data["labels"] = [int(any(lo <= t <= hi for lo, hi in windows)) for t in data["times"]]
    data["features"] = [item["metric"]]
    return dict(name=item["title"], source=slug, logs=[], **data)
