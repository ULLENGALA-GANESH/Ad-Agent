"""Offline execution profile of the project's original seven-node LangGraph."""
from bisect import bisect_left
import hashlib
import json
from time import perf_counter

import numpy as np

from main import compiled_full_graph
from .briefs import create_brief
from .detection import CATALOG, CUTOFFS, evaluate, groups, profile

VERSION = "incident-lab-1"
STAGE_INPUT = {
    "processor": "Mapped observations and optional event log",
    "selector": "Fitting cadence, feature count and data type",
    "info": "Eligible detectors and their reference specifications",
    "code": "Candidate specifications and chronological split",
    "review": "Detector plan, boundaries and schema",
    "eval": "Reviewed plan and ordered observations",
    "opt": "Locked detector, held-out scores and timestamped evidence",
}


def digest(data):
    return hashlib.sha256(json.dumps(data, sort_keys=True, separators=(",", ":"), allow_nan=False)
                          .encode("utf-8")).hexdigest()


def build_incidents(data, p, evaluation):
    series = evaluation["series"]
    scores = np.asarray(series["scores"])
    episodes = groups(scores >= evaluation["cutoff"], series["times"], p["cadence"])
    logs = data["logs"]
    log_times = [event["time"] for event in logs]
    incidents = []
    for number, (start, end) in enumerate(episodes, 1):
        period = np.asarray(series["deviation"][start:end+1])
        offset, feature = np.unravel_index(period.argmax(), period.shape)
        peak = start + int(offset)
        feature = int(feature)
        incident = dict(id=number, start=start, end=end, peak=peak, feature=feature,
                        count=end-start+1, metric=p["features"][feature],
                        first_record=p["val_end"]+start+1, peak_record=p["val_end"]+peak+1,
                        peak_score=float(scores[start:end+1].max()),
                        observed=series["values"][peak][feature], expected=series["center"][peak][feature],
                        low=series["low"][peak][feature], high=series["high"][peak][feature],
                        start_time=None, end_time=None, duration_min=None, logs=[], log_count=0)
        if series["times"]:
            first, last = series["times"][start], series["times"][end]
            left = bisect_left(log_times, first)
            right = bisect_left(log_times, last + p["cadence"])
            incident.update(start_time=first, end_time=last,
                            duration_min=(last-first)/60, logs=logs[left:min(right, left+10)],
                            log_count=right-left)
        incidents.append(incident)
    return incidents


class Investigation:
    def __init__(self, data, checkpoints=None, journal=None):
        self.data = data
        self.outputs = dict(checkpoints or {})
        self.journal = journal

    def run(self):
        compiled_full_graph.invoke({"investigation": self})
        return self.outputs

    def run_stage(self, stage):
        if stage in self.outputs:
            return
        if self.journal:
            self.journal.begin(stage, STAGE_INPUT[stage])
        before = perf_counter()
        result, decision, evidence = getattr(self, stage)()
        elapsed = (perf_counter() - before) * 1000
        if self.journal:
            self.journal.finish(stage, result, decision, evidence, elapsed)
        self.outputs[stage] = result

    def processor(self):
        p = profile(self.data)
        return p, f"Profiled {p['rows']:,} rows as {p['kind'].lower()}.", p

    def selector(self):
        p = self.outputs["processor"]
        models = ["robust", "forest", "ensemble"]
        if p["period"]:
            models.append("seasonal")
        return models, f"Admitted {len(models)} compatible detectors.", {
            "candidates": [CATALOG[m][0] for m in models],
            "seasonality": f"{p['period']} UTC slots per day" if p["period"] else
                           "Daily model requires at least three regular daily cycles in fitting data."}

    def info(self):
        cards = {m: CATALOG[m][1] for m in self.outputs["selector"]}
        return cards, "Retrieved implementation notes for every candidate.", cards

    def code(self):
        p = self.outputs["processor"]
        plan = dict(version=VERSION, models=list(self.outputs["info"]), cutoffs=list(CUTOFFS),
                    seed=42, fit=[0, p["fit_end"]], calibrate=[p["fit_end"], p["cal_end"]],
                    validate=[p["cal_end"], p["val_end"]], test=[p["val_end"], p["rows"]])
        return plan, "Compiled a declarative detector plan.", plan

    def review(self):
        plan, p = self.outputs["code"], self.outputs["processor"]
        ranges = [plan[key] for key in ("fit", "calibrate", "validate", "test")]
        checks = {
            "nonempty_partitions": all(0 <= lo < hi for lo, hi in ranges),
            "disjoint_and_complete": (ranges[0][0] == 0 and ranges[-1][1] == p["rows"] and
                                      all(x[1] == y[0] for x, y in zip(ranges, ranges[1:]))),
            "registered_detectors": plan["models"] == self.outputs["selector"] and
                                    all(m in CATALOG for m in plan["models"]),
            "fixed_operating_points": tuple(plan["cutoffs"]) == CUTOFFS,
        }
        if not all(checks.values()):
            raise ValueError("Plan failed pre-execution review.")
        result = dict(checks=checks, plan_sha256=digest(plan))
        return result, "Verified split boundaries and detector configuration.", result

    def eval(self):
        if self.outputs["review"]["plan_sha256"] != digest(self.outputs["code"]):
            raise ValueError("Plan changed after review.")
        result = evaluate(self.data, self.outputs["processor"], self.outputs["code"])
        selected = CATALOG[result["selected"]][0]
        return result, f"Locked {selected} at {result['cutoff']:.1%}.", {
            "selection": result["reason"], "held_out": result["heldout"][result["selected"]]}

    def opt(self):
        evaluation = self.outputs["eval"]
        incidents = build_incidents(self.data, self.outputs["processor"], evaluation)
        result = dict(incidents=incidents)
        artifact = dict(
            incidents=len(incidents), alerts=sum(i["count"] for i in incidents),
            matching_log_entries=sum(i["log_count"] for i in incidents),
            grouping="Adjacent alerts. Time gaps above 1.5 sampling intervals break an incident. Tabular alerts stay independent.")
        if self.data.get("brief_model") and incidents:
            # Rank by standardized deviation so features on different scales are comparable.
            deviations = evaluation["series"]["deviation"]
            lead = max(incidents, key=lambda i: deviations[i["peak"]][i["feature"]])
            brief = create_brief(lead, self.data["brief_model"])
            result["brief"] = brief
            artifact["brief"] = {key:brief[key] for key in ("incident","status","model","calls","tools","rejected","elapsed_ms")}
            artifact["brief"]["verified_claims"] = len(brief["claims"])
        return result, f"Grouped alerts into {len(incidents)} incidents.", artifact


def incident_detail(incident, evaluation, p):
    series = evaluation["series"]
    start, end, peak, f = (incident[k] for k in ("start", "end", "peak", "feature"))
    # Include context and preserve the two extrema of every bucket on long incidents.
    left, right = max(start-35, 0), min(end+36, len(series["scores"]))
    ids = {start, end, peak, left, right-1}
    for chunk in np.array_split(np.arange(left, right), min(180, right-left)):
        values = [series["values"][int(i)][f] for i in chunk]
        ids.update([int(chunk[np.argmin(values)]), int(chunk[np.argmax(values)])])
    points = []
    for i in sorted(ids):
        points.append(dict(record=p["val_end"]+i+1, time=series["times"][i] if series["times"] else None,
                           value=series["values"][i][f], center=series["center"][i][f],
                           low=series["low"][i][f], high=series["high"][i][f],
                           score=series["scores"][i], flagged=series["scores"][i] >= evaluation["cutoff"]))
    return dict(**incident, points=points, last_record=p["val_end"]+end+1)
