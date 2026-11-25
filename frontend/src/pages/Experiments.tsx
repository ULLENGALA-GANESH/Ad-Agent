import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Loader2, RefreshCw, Search } from "lucide-react";
import { getExperiments } from "../api/client";
import { Badge, Button, Card, SectionTitle } from "../components/ui";
import { Experiment } from "../types";

export default function Experiments() {
  const [items, setItems] = useState<Experiment[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const fetchItems = () => {
    setError("");
    setLoading(true);
    getExperiments()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to read research history."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = items.filter((e) => {
    const q = query.toLowerCase();
    return (
      e.id.toLowerCase().includes(q) ||
      (e.dataset && e.dataset.toLowerCase().includes(q)) ||
      (e.model && e.model.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end mb-6">
        <SectionTitle
          eyebrow="Run history"
          title="Experiments"
          description="Searchable history of anomaly detection runs and their evaluation modes."
        />
        <Button variant="outline" onClick={fetchItems} className="text-xs py-1.5 px-3">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {error && <p role="alert" className="lab-error">{error}</p>}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-zinc-800 p-4">
          <Search size={15} className="text-zinc-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm outline-none text-zinc-200 placeholder-zinc-600"
            placeholder="Search experiment ID, dataset, or model..."
          />
          {loading && <Loader2 size={15} className="animate-spin text-zinc-500" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-xs">
            <thead className="bg-zinc-950/50 text-[10px] uppercase tracking-widest text-zinc-600">
              <tr>
                {["Experiment ID", "Dataset", "Selected model", "AUROC", "AUPRC", "Metric source", "Evaluation mode", "Runtime", "Status", "Date", "Action"].map((h) => (
                  <th key={h} className="px-4 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-zinc-900/50 transition">
                  <td className="px-4 py-4">
                    <Link
                      to={`/results?jobId=${encodeURIComponent(e.id)}`}
                      className="font-mono font-medium text-lime-300 hover:underline flex items-center gap-1"
                    >
                      {e.id.length > 20 ? `${e.id.slice(0, 8)}...` : e.id}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-zinc-300">{e.dataset}</td>
                  <td className="px-4 font-semibold text-zinc-200">{e.model}</td>
                  <td className="px-4 text-zinc-300">{e.metric_source === "script-reported" && e.auroc != null ? e.auroc.toFixed(4) : "—"}</td>
                  <td className="px-4 text-zinc-300">{e.metric_source === "script-reported" && e.auprc != null ? e.auprc.toFixed(4) : "—"}</td>
                  <td className="px-4 text-zinc-400">{e.metric_source === "script-reported" ? "Research script" : e.status === "Completed" ? "Unverified" : "—"}</td>
                  <td className="px-4 text-zinc-500">{e.evaluationMode}</td>
                  <td className="px-4 text-zinc-400">{e.runtime}</td>
                  <td className="px-4">
                    <Badge tone={e.status === "Completed" ? "success" : e.status === "Running" ? "warning" : "danger"}>
                      {e.status}
                    </Badge>
                  </td>
                  <td className="px-4 text-zinc-600">{e.date}</td>
                  <td className="px-4">
                    <Link
                      to={`/results?jobId=${encodeURIComponent(e.id)}`}
                      className="text-[11px] text-zinc-400 hover:text-white inline-flex items-center gap-0.5"
                    >
                      View <ArrowUpRight size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-zinc-500">
                    {query ? "No experiments match this search." : "No research experiments have been recorded."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
