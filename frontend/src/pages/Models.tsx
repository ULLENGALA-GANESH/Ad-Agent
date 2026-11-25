import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, Check, CircleHelp, RefreshCw } from "lucide-react";
import { models as fallbackModels } from "../data/mock";
import { Badge, Button, Card, SectionTitle } from "../components/ui";
import { getModels } from "../api/client";

export default function Models() {
  const [modelList, setModelList] = useState(fallbackModels);
  const [source, setSource] = useState<"Backend API" | "Default Spec">("Default Spec");

  useEffect(() => {
    getModels()
      .then((data) => {
        if (data && data.length > 0) {
          setModelList(data);
          setSource("Backend API");
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end mb-6">
        <SectionTitle
          eyebrow="Evidence layer"
          title="Model selection & evidence"
          description="Trace the path from dataset characteristics to candidate models, historical evidence, and the automated recommendation."
        />
        <Badge tone={source === "Backend API" ? "success" : "neutral"}>
          {source === "Backend API" ? "Connected: PyOD & Darts" : "Reference Library"}
        </Badge>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-center gap-2 py-5 text-center text-xs">
          {["Current Dataset", "Dataset Characteristics", "Candidate Models", "Historical Evidence", "LLM Recommendation"].map(
            (x, i) => (
              <div key={x} className="flex items-center gap-2">
                <div className="border border-zinc-700 bg-zinc-950 px-4 py-3 font-medium text-zinc-200">{x}</div>
                {i < 4 && <ArrowRight size={14} className="text-zinc-600" />}
              </div>
            )
          )}
        </div>
      </Card>

      <Card className="mt-5 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="text-sm font-medium">Candidate model comparison</div>
          <span className="text-xs text-zinc-500">{modelList.length} algorithms profiled</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-zinc-950/60 text-[10px] uppercase tracking-widest text-zinc-600">
              <tr>
                {["Model", "Model type", "Compatibility", "Benchmark AUROC", "Benchmark AUPRC", "Typical Runtime", "Selection"].map((h) => (
                  <th key={h} className="px-5 py-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {modelList.map((m) => (
                <tr key={m.name} className={m.status === "Selected" ? "bg-lime-400/[.025]" : "hover:bg-zinc-900/30"}>
                  <td className="px-5 py-4 font-mono font-semibold text-zinc-200">{m.name}</td>
                  <td className="px-5 py-4 text-zinc-400">{m.type}</td>
                  <td className="px-5 py-4">{m.compatibility}</td>
                  <td className="px-5 py-4 font-mono text-zinc-300">{Number(m.auroc).toFixed(3)}</td>
                  <td className="px-5 py-4 font-mono text-zinc-300">{Number(m.auprc).toFixed(3)}</td>
                  <td className="px-5 py-4 text-zinc-400">{m.runtime}</td>
                  <td className="px-5 py-4">
                    {m.status === "Selected" ? (
                      <Badge tone="success"><Check size={12} /> Selected</Badge>
                    ) : (
                      <Badge tone="neutral">Candidate</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <div className="flex items-center gap-2 text-sm font-medium">
            <CircleHelp size={16} className="text-lime-300" /> Profiling criteria
          </div>
          <div className="mt-5 space-y-4">
            {[
              ["Dimensionality", "12 numerical features"],
              ["Temporal structure", "Strong dependence"],
              ["Seasonality", "Weekly pattern"],
              ["Noise", "Moderate"],
              ["Dataset size", "18,420 rows"],
              ["Similar datasets", "7 historical matches"],
              ["Historical performance", "Median AUROC 0.91"],
            ].map(([a, b]) => (
              <div key={a} className="flex items-center justify-between border-b border-zinc-800 pb-3 text-xs">
                <span className="text-zinc-500">{a}</span>
                <span className="text-zinc-300 font-medium">{b}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-medium">Evidence interpretation</div>
          <div className="mt-5 space-y-4 text-sm leading-6 text-zinc-400">
            <p>
              <span className="text-zinc-200 font-medium">Empirical evidence:</span> historical runs and current evaluation metrics provide measurable signals about model compatibility.
            </p>
            <p>
              <span className="text-zinc-200 font-medium">Automated reasoning:</span> a reasoning layer synthesizes the dataset profile and retrieved evidence into a recommendation.
            </p>
            <p>
              <span className="text-zinc-200 font-medium">Human decision:</span> optional reviewer feedback can accept or request another candidate before execution.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs text-lime-300">
            <ArrowDown size={14} /> Recommendation is grounded in benchmark evidence.
          </div>
        </Card>
      </div>
    </div>
  );
}