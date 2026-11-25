import { useEffect, useState } from "react";
import { Card, Badge, SectionTitle } from "../components/ui";
import { benchmarkData as fallbackBenchmarkData } from "../data/mock";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getBenchmarks } from "../api/client";

export default function Benchmarks() {
  const [data, setData] = useState(fallbackBenchmarkData);
  const [source, setSource] = useState<"Backend API" | "Reference Spec">("Reference Spec");

  useEffect(() => {
    getBenchmarks()
      .then((res) => {
        if (res && res.length > 0) {
          setData(res);
          setSource("Backend API");
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <SectionTitle
          eyebrow="Research evaluation"
          title="Benchmarks"
          description="Compare experimental strategies on standardized anomaly detection benchmarks."
        />
        <Badge tone={source === "Backend API" ? "success" : "neutral"}>
          {source === "Backend API" ? "Verified backend metrics" : "Reference Benchmarks"}
        </Badge>
      </div>

      <Card>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#52525b" />
              <YAxis domain={[0, 1]} stroke="#52525b" fontSize={11} />
              <Tooltip contentStyle={{ background: "#111114", border: "1px solid #27272a", fontSize: 12 }} />
              <Bar dataKey="auroc" name="AUROC" fill="#a3e635" />
              <Bar dataKey="auprc" name="AUPRC" fill="#52525b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="mt-5 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-xs">
            <thead className="bg-zinc-950/50 text-left text-[10px] uppercase tracking-widest text-zinc-600">
              <tr>
                {["Strategy", "AUROC", "AUPRC", "Selection regret", "Success rate", "Failed executions", "Iterations", "Latency", "LLM calls", "Est. cost"].map((h) => (
                  <th key={h} className="px-4 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.map((r) => (
                <tr key={r.name} className="hover:bg-zinc-900/40 transition">
                  <td className="px-4 py-4 font-medium text-zinc-200">{r.name}</td>
                  <td className="px-4 font-mono text-lime-300">{Number(r.auroc).toFixed(2)}</td>
                  <td className="px-4 font-mono text-zinc-300">{Number(r.auprc).toFixed(2)}</td>
                  <td className="px-4 font-mono text-zinc-400">{r.regret}</td>
                  <td className="px-4 text-zinc-300">{r.success}%</td>
                  <td className="px-4 text-zinc-400">{r.failures}</td>
                  <td className="px-4 text-zinc-400">{r.iterations}</td>
                  <td className="px-4 font-mono text-zinc-400">{r.latency}s</td>
                  <td className="px-4 text-zinc-400">{r.calls}</td>
                  <td className="px-4 font-mono text-zinc-300">${Number(r.cost).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}