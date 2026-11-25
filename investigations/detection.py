"""Detectors, chronological model selection, and incident-level scoring."""
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.metrics import average_precision_score, roc_auc_score

CUTOFFS = (0.95, 0.975, 0.99)
CATALOG = {
    "robust": ("Robust deviation", "Largest absolute feature deviation from its fitting median, scaled by MAD."),
    "forest": ("Isolation Forest", "100 randomized trees fitted to all signal columns together; seed 42."),
    "ensemble": ("Rank ensemble", "Equal-weight mean of the calibrated robust and forest percentile ranks."),
    "seasonal": ("Daily seasonal median", "Deviation from the fitting median for the same time-of-day slot."),
}


def profile(data):
    n = len(data["values"])
    fit_end, cal_end, val_end = (n * p // 100 for p in (40, 60, 80))
    times = data["times"]
    step, period = None, None
    if times:
        # Learn cadence and eligibility on fitting observations only.
        fit_times = np.asarray(times[:fit_end])
        gaps = np.diff(fit_times)
        step = float(np.median(gaps))
        slots = round(86400 / step)
        if (2 <= slots <= fit_end // 3 and abs(slots * step - 86400) <= step * 0.001
                and np.allclose(gaps, step, rtol=0.001, atol=0.001)):
            period = slots
    return dict(rows=n, features=data["features"], kind="Time series" if times else "Numeric table",
                fit_end=fit_end, cal_end=cal_end, val_end=val_end, cadence=step, period=period,
                labeled=data["labels"] is not None)


def baseline(values):
    center = np.median(values, axis=0)
    mad = np.median(np.abs(values - center), axis=0) * 1.4826
    scale = np.where(mad > 0, mad, np.std(values, axis=0))
    scale = np.where(scale > 0, scale, np.maximum(1, np.abs(center)) * 1e-8)
    low, high = np.quantile(values, [0.05, 0.95], axis=0)
    return center, np.maximum(scale, 1e-260), low, high


def fit_signals(data, p, models):
    values = np.asarray(data["values"], dtype=float)
    a, b = p["fit_end"], p["cal_end"]
    train, observed = values[:a], values[a:]
    center, scale, low, high = baseline(train)
    deviations = np.abs(observed - center) / scale
    forest = IsolationForest(n_estimators=100, random_state=42, n_jobs=1).fit(train)
    raw = {"robust": deviations.max(axis=1), "forest": -forest.score_samples(observed)}
    references = {key: np.broadcast_to(item, observed.shape)
                  for key, item in zip(("center", "low", "high", "deviation"), (center, low, high, deviations))}
    seasonal = None
    if "seasonal" in models:
        period = p["period"]
        slots = np.rint((np.asarray(data["times"][a:]) - data["times"][0]) / p["cadence"]).astype(int) % period
        centers, scales, lows, highs = (np.asarray(items)[slots] for items in
                                        zip(*(baseline(train[phase::period]) for phase in range(period))))
        distance = np.abs(observed - centers) / scales
        raw["seasonal"] = distance.max(axis=1)
        seasonal = dict(center=centers, low=lows, high=highs, deviation=distance)
    ranks = {}
    for name, scores in raw.items():
        reference = np.sort(scores[:b-a])
        ranks[name] = np.searchsorted(reference, scores, side="left") / len(reference)
    ranks["ensemble"] = (ranks["robust"] + ranks["forest"]) / 2
    return ranks, references, seasonal


def groups(mask, times, cadence):
    """Consecutive flagged samples form one episode; large sampling gaps break it."""
    indices = np.flatnonzero(mask)
    if not len(indices):
        return []
    if not len(times):
        return [(int(i), int(i)) for i in indices]
    breaks = (np.diff(indices) != 1) | (np.diff(np.asarray(times)[indices]) > 1.5 * cadence)
    return [(int(run[0]), int(run[-1])) for run in np.split(indices, np.flatnonzero(breaks) + 1)]


def metrics(scores, cutoff, labels, times, cadence):
    mask = scores >= cutoff
    alarms = groups(mask, times, cadence)
    out = dict(alerts=int(mask.sum()), incidents=len(alarms), alert_fraction=float(mask.mean()))
    if labels is None:
        return out
    truth = np.asarray(labels, dtype=bool)
    windows = groups(truth, times, cadence)
    # Match each alarm to at most one reference episode, in chronological order.
    cursor, matches, delays = 0, 0, []
    for first, last in alarms:
        while cursor < len(windows) and windows[cursor][1] < first:
            cursor += 1
        if cursor < len(windows) and windows[cursor][0] <= last:
            start = windows[cursor][0]
            if len(times):
                delays.append((times[max(start, first)] - times[start]) / 60)
            matches += 1
            cursor += 1
    out.update(reference=len(windows), matched=matches, unmatched=len(alarms)-matches,
               recall=matches / len(windows) if windows else None,
               precision=matches / len(alarms) if alarms else None,
               f1=2 * matches / (len(windows) + len(alarms)) if windows or alarms else 0,
               median_delay_min=float(np.median(delays)) if delays else None,
               tp=int(np.sum(mask & truth)), fp=int(np.sum(mask & ~truth)),
               fn=int(np.sum(~mask & truth)))
    if len(times):
        days = (times[-1] - times[0] + cadence) / 86400
        out["false_per_day"] = out["unmatched"] / days
    return out


def evaluate(data, p, plan):
    models = plan["models"]
    a, b, c = p["fit_end"], p["cal_end"], p["val_end"]
    ranks, ordinary, seasonal = fit_signals(data, p, models)
    times, labels = data["times"], data["labels"]
    val_labels = labels[b:c] if labels is not None else None
    validation = {}
    for model in models:
        validation[model] = [
            dict(cutoff=cutoff, **metrics(ranks[model][b-a:c-a], cutoff, val_labels, times[b:c], p["cadence"]))
            for cutoff in plan["cutoffs"]
        ]
    informed = val_labels is not None and len(set(val_labels)) == 2
    if informed:
        # Stable order resolves final ties in favor of the simpler catalog entry.
        selected, row = max(((m, r) for m in models for r in validation[m]),
                            key=lambda pair: (pair[1]["f1"], -pair[1]["unmatched"], pair[1]["cutoff"]))
        cutoff = row["cutoff"]
        reason = "Best validation incident F1; ties favor fewer unmatched alarms, then a higher cutoff and catalog order."
    else:
        selected = "seasonal" if "seasonal" in models else "robust"
        cutoff = 0.99
        reason = "Validation lacks both label classes. Using the available daily baseline or robust median at the 99th percentile."
    # The operating point is now locked. No test labels enter the selection above.
    test_labels = labels[c:] if labels is not None else None
    heldout = {}
    for model in models:
        if informed:
            best = max(validation[model], key=lambda r: (r["f1"], -r["unmatched"], r["cutoff"]))
            model_cutoff = best["cutoff"]
        else:
            model_cutoff = cutoff
        scores = ranks[model][c-a:]
        summary = metrics(scores, model_cutoff, test_labels, times[c:], p["cadence"])
        if test_labels is not None and len(set(test_labels)) == 2:
            summary.update(auroc=float(roc_auc_score(test_labels, scores)),
                           average_precision=float(average_precision_score(test_labels, scores)))
        heldout[model] = dict(cutoff=model_cutoff, **summary)
    ref = seasonal if selected == "seasonal" else ordinary
    series = {key: value[c-a:].tolist() for key, value in ref.items()}
    series.update(scores=ranks[selected][c-a:].tolist(), values=data["values"][c:], times=times[c:],
                  labels=test_labels)
    return dict(selected=selected, cutoff=cutoff, reason=reason, validation=validation,
                heldout=heldout, series=series)
