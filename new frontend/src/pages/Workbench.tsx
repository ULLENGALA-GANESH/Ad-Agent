import { useState } from "react";
import { API_BASE_URL } from "../api/client";

type Metrics = { alerts: number; tp?: number; fp?: number; fn?: number; roc_auc?: number; average_precision?: number };
type Report = {
  fit: number; calibration: number; evaluated: number; features: string[]; alert_rate: number;
  models: Record<string, Metrics>;
  findings: { record: number; score: number; flagged: boolean; feature: string; value: number; baseline: number; label: number | null }[];
};
const names: Record<string, string> = {
  robust_deviation: "Robust deviation", isolation_forest: "Isolation Forest", ensemble: "Rank ensemble"
};
const panel = "space-y-4 border border-zinc-800 bg-zinc-950 p-5";
const table = "w-full text-left text-sm [&_td]:p-2 [&_th]:p-2 [&_th]:text-zinc-400 [&_tr]:border-b [&_tr]:border-zinc-800";

export default function Workbench() {
  const [file, setFile] = useState<File>();
  const [rate, setRate] = useState("0.05");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report>();
  async function run(demo: boolean) {
    setBusy(true);
    setError("");
    setReport(undefined);
    try {
      const body = new FormData();
      if (demo) body.append("demo", "1");
      else if (file) body.append("file", file);
      body.append("alert_rate", rate);
      const response = await fetch(API_BASE_URL + "/workbench/analyze", { method: "POST", body });
      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        throw new Error(details.error || (response.status === 413 ? "CSV exceeds the upload limit." : "Analysis failed."));
      }
      setReport(await response.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="mx-auto max-w-6xl space-y-6">
    <header><h1 className="text-3xl font-semibold">Anomaly workbench</h1>
      <p className="mt-2 text-zinc-400">Compare detectors on fresh observations and inspect the highest-ranked records.</p></header>
    <section className={panel}>
      <label className="block font-medium">Ordered CSV
        <input className="mt-2 block max-w-full text-sm" type="file" accept=".csv,text/csv" disabled={busy} onChange={e => setFile(e.target.files?.[0])}/>
      </label>
      <p className="text-sm text-zinc-400">100–10,000 records, up to 2 MB. Use numeric features and optionally include id, timestamp or a binary label. Put baseline observations first.</p>
      <label className="block text-sm">Alert threshold
        <select className="ml-3 rounded bg-zinc-800 p-2" value={rate} disabled={busy} onChange={e => setRate(e.target.value)}>
          <option value="0.01">99th percentile</option><option value="0.05">95th percentile</option><option value="0.10">90th percentile</option>
        </select></label>
      <div className="flex flex-wrap gap-3">
        <button disabled={busy || !file} onClick={() => run(false)} className="rounded bg-lime-300 px-4 py-2 text-black disabled:opacity-40">Analyze CSV</button>
        <button disabled={busy} onClick={() => run(true)} className="rounded border border-zinc-600 px-4 py-2">Run sensor demo</button>
      </div>
      {busy && <p role="status">Fitting and evaluating detectors…</p>}
      {error && <p role="alert" className="text-red-300">{error}</p>}
    </section>
    {report && <>
      <section className={panel}><h2 className="text-xl font-semibold">Detector comparison</h2>
        <p className="text-sm text-zinc-400">{report.fit} baseline · {report.calibration} calibration · {report.evaluated} evaluated · Threshold {Math.round(100 * (1 - report.alert_rate))}%</p>
        <div className="overflow-x-auto"><table className={table}><thead><tr>{["Detector","Alerts","True alerts","False alerts","Missed","ROC AUC","Avg. precision"].map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{Object.entries(report.models).map(([key,m]) => <tr key={key}><td>{names[key]}</td><td>{m.alerts}</td><td>{m.tp ?? "—"}</td><td>{m.fp ?? "—"}</td><td>{m.fn ?? "—"}</td><td>{m.roc_auc?.toFixed(3) ?? "—"}</td><td>{m.average_precision?.toFixed(3) ?? "—"}</td></tr>)}</tbody></table></div>
      </section>
      <section className={panel}><h2 className="text-xl font-semibold">Highest-ranked records</h2>
        <p className="text-sm text-zinc-400">Mean detector percentile and the feature with the largest scaled deviation from its baseline median.</p>
        <div className="overflow-x-auto"><table className={table}><thead><tr>{["Record","Score","Alert","Feature","Observed","Median","Label"].map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{report.findings.map(f => <tr key={f.record}><td>{f.record}</td><td>{(f.score*100).toFixed(1)}%</td><td className={f.flagged ? "text-lime-300" : ""}>{f.flagged ? "Flagged" : "Clear"}</td><td>{f.feature}</td><td>{f.value}</td><td>{Number(f.baseline.toPrecision(6))}</td><td>{f.label ?? "—"}</td></tr>)}</tbody></table></div>
      </section></>}
  </div>;
}
