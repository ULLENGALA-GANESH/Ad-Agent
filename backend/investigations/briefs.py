"""Grounded incident briefs. The optional model can read three bounded evidence tools."""
import argparse
import json
import os
from http.client import HTTPException
from pathlib import Path
from time import perf_counter
from urllib.error import URLError
from urllib.request import ProxyHandler, Request, build_opener

TOOLS = {
    "inspect_signal": "Observed value at the largest scaled excursion and its record number.",
    "compare_baseline": "Fitting median and lower and upper reference bounds at that observation.",
    "read_event_window": "Count of alerted observations and accompanying log entries in this window.",
}
FOLLOW_UP = {
    "preceding": "Inspect the observations preceding the first alert.",
    "peer": "Compare a related service metric over the same window.",
    "events": "Review deployment and operational logs from the alert window.",
}


def facts(incident):
    def fact(key, label, value, evidence):
        return dict(key=key, label=label, value=value, evidence=evidence)
    peak = f"Record {incident['peak_record']}"
    window = f"Incident #{incident['id']}"
    return {
        "inspect_signal": [fact("observed", "Observed value", incident["observed"], peak),
                           fact("record", "Peak record", incident["peak_record"], peak)],
        "compare_baseline": [fact("median", "Fitting median", incident["expected"], peak),
                             fact("low", "Lower reference bound", incident["low"], peak),
                             fact("high", "Upper reference bound", incident["high"], peak)],
        "read_event_window": [fact("alerts", "Alerted observations", incident["count"], window),
                              fact("events", "Matching log entries", incident["log_count"], window)],
    }


def local_chat(model, system, payload, schema):
    port = int(os.getenv("AD_AGENT_OLLAMA_PORT", "11434"))
    body = dict(model=model, messages=[dict(role="system", content=system),
                                      dict(role="user", content=json.dumps(payload))],
                stream=False, format=schema, options=dict(temperature=0, seed=42, num_predict=250))
    req = Request(f"http://127.0.0.1:{port}/api/chat", method="POST",
                  headers={"Content-Type":"application/json"}, data=json.dumps(body).encode())
    with build_opener(ProxyHandler({})).open(req, timeout=90) as response:
        result = json.load(response)
    return json.loads(result["message"]["content"])


def create_brief(incident, model, ask=local_chat):
    bank = facts(incident)
    baseline = [bank["inspect_signal"][0], bank["compare_baseline"][0], *bank["read_event_window"]]
    out = dict(incident=incident["id"], model=model, baseline=baseline, status="unavailable",
               claims=[], rejected=0, tools=[], calls=0, next_check=None)
    started = perf_counter()
    try:
        tool_schema = dict(type="object", required=["tools"], properties={
            "tools":dict(type="array", minItems=1, maxItems=3,
                         items=dict(type="string", enum=list(TOOLS)))})
        out["calls"] += 1
        plan = ask(model, "Choose evidence tools to investigate this anomaly. Reply using the requested JSON schema.",
                   dict(metric=incident["metric"], tools=TOOLS), tool_schema)
        if not isinstance(plan.get("tools"), list) or not 1 <= len(plan["tools"]) <= 3:
            raise ValueError("Invalid tool plan")
        chosen = list(dict.fromkeys(plan["tools"]))
        if any(tool not in TOOLS for tool in chosen):
            raise ValueError("Unknown evidence tool")
        out["tools"] = chosen
        available = {f["key"]:f for tool in chosen for f in bank[tool]}
        answer_schema = dict(type="object", required=["claims","follow_up"], properties={
            "claims":dict(type="array", minItems=1, maxItems=4, items=dict(type="object",
                required=["key","value"],properties={
                    "key":dict(type="string", enum=list(available)), "value":dict(type="number")})),
            "follow_up":dict(type="string",enum=list(FOLLOW_UP))})
        out["calls"] += 1
        answer = ask(model, "Report up to four distinct numeric findings by copying their keys and exact values. "
                     "Choose one follow-up check. Output JSON.", dict(evidence=list(available.values()),
                     follow_up=FOLLOW_UP), answer_schema)
        claims = answer.get("claims")
        if not isinstance(claims, list) or not 1 <= len(claims) <= 4:
            raise ValueError("Invalid evidence response")
        follow_up = answer.get("follow_up")
        if not isinstance(follow_up, str) or follow_up not in FOLLOW_UP:
            raise ValueError("Invalid follow-up check")
        seen = set()
        for claim in claims:
            key = claim.get("key") if isinstance(claim,dict) else None
            original = available.get(key) if isinstance(key,str) else None
            value = claim.get("value") if isinstance(claim,dict) else None
            if (original is None or key in seen or type(value) not in (float,int)
                    or value != original["value"]):
                out["rejected"] += 1
                continue
            seen.add(key)
            out["claims"].append(original)
        if out["claims"]:
            out.update(status="verified", next_check=FOLLOW_UP[follow_up])
        else:
            out["status"] = "no_verified_claims"
    except (URLError, OSError, HTTPException, ValueError, KeyError, TypeError, AttributeError, OverflowError):
        out["reason"] = "The local model was unavailable or returned an invalid structured response."
    out["elapsed_ms"] = round((perf_counter()-started)*1000,1)
    return out


if __name__=="__main__":
    from .benchmark import REPORT
    parser = argparse.ArgumentParser(description="Compare grounded local-model and deterministic briefs on the fixed examples.")
    parser.add_argument("--model",default=os.getenv("AD_AGENT_OLLAMA_MODEL","llama3.2:3b"))
    parser.add_argument("--output",type=Path)
    args = parser.parse_args()
    results = []
    for case in json.loads(REPORT.read_text(encoding="utf-8"))["datasets"]:
        if case["example"]:
            brief = create_brief(case["example"],args.model)
            results.append(dict(dataset=case["id"],**brief))
            print(case["id"],brief["status"],len(brief["claims"]),"verified,",brief["rejected"],"rejected,",brief["elapsed_ms"],"ms",flush=True)
    if args.output:
        args.output.write_text(json.dumps(results,indent=2)+"\n",encoding="utf-8")
    if not all(r["status"]=="verified" for r in results):
        raise SystemExit(1)
