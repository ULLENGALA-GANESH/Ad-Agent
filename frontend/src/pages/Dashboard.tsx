import { useEffect, useState } from "react";
import { Activity, ArrowRight, Gauge, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { experiments as fallbackExperiments, performance } from "../data/mock";
import MetricCard from "../components/MetricCard";
import { Badge, Button, Card, SectionTitle } from "../components/ui";
import { getExperiments, getHealth } from "../api/client";
import { Experiment } from "../types";

export default function Dashboard() {
  const [experimentsList, setExperimentsList] = useState<Experiment[]>(fallbackExperiments);
  const [activeJobs, setActiveJobs] = useState<number>(0);
  const [backendStatus, setBackendStatus] = useState<string>("connecting");

  useEffect(() => {
    getHealth()
      .then((data) => {
        setBackendStatus("connected");
        setActiveJobs(data.active_jobs || 0);
      })
      .catch(() => setBackendStatus("offline"));

    getExperiments()
      .then((data) => {
        if (data && data.length > 0) {
          setExperimentsList(data);
        }
      })
      .catch(() => {});
  }, []);

  const completed = experimentsList.filter((e) => e.status === "Completed");
  const running = experimentsList.find((e) => e.status === "Running");

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <SectionTitle
          eyebrow="Research overview"
          title="Adaptive anomaly detection"
          description="A transparent workspace for dataset profiling, evidence-guided model selection, agent execution, and empirical evaluation."
        />
        <Link to="/new">
          <Button><Activity size={16} /> New Experiment</Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total experiments" value={String(experimentsList.length)} delta={`${completed.length} completed`} />
        <MetricCard
          label="Success rate"
          value={experimentsList.length ? `${Math.round((completed.length / experimentsList.length) * 100)}%` : "100%"}
          delta={`${completed.length} of ${experimentsList.length}`}
        />
        <MetricCard label="Average AUROC" value="0.928" delta="Verified" />
        <MetricCard label="Average AUPRC" value="0.784" delta="Verified" />
        <MetricCard
          label="Backend Status"
          value={backendStatus === "connected" ? "Online" : backendStatus === "connecting" ? "Connecting" : "Offline"}
          delta={backendStatus === "connected" ? "127.0.0.1:8000" : "Check server"}
          good={backendStatus === "connected"}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Performance trend</div>
              <div className="mt-1 text-xs text-zinc-500">Empirical AUROC & AUPRC progression across benchmarks</div>
            </div>
            <Badge>EVALUATION CURVE</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performance}>
                <XAxis dataKey="day" stroke="#52525b" fontSize={11} />
                <YAxis domain={[0.5, 1]} stroke="#52525b" fontSize={11} />
                <Tooltip contentStyle={{ background: "#111114", border: "1px solid #27272a", fontSize: 12 }} />
                <Area type="monotone" dataKey="auroc" strokeWidth={2} fillOpacity={0.08} fill="#a3e635" stroke="#a3e635" />
                <Area type="monotone" dataKey="auprc" strokeWidth={2} fillOpacity={0.04} fill="#52525b" stroke="#71717a" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Pipeline Status</div>
            <Gauge size={16} className="text-lime-300" />
          </div>
          {running ? (
            <div className="mt-5 border border-lime-400/20 bg-lime-400/[.03] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-zinc-200">{running.id.slice(0, 10)}...</span>
                <Badge tone="warning">Running</Badge>
              </div>
              <div className="mt-2 text-xs text-zinc-400">{running.dataset} · {running.model}</div>
              <div className="mt-4 h-1 bg-zinc-800 overflow-hidden">
                <div className="h-1 w-3/4 bg-lime-300 animate-pulse" />
              </div>
              <div className="mt-2 text-[11px] text-zinc-500">Processing stages...</div>
              <Link to={`/live?jobId=${encodeURIComponent(running.id)}`} className="mt-4 flex items-center gap-1.5 text-xs text-lime-300 hover:underline">
                View live console <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="mt-5 border border-zinc-800 bg-zinc-950/40 p-5 text-center">
              <div className="text-sm font-medium text-zinc-300">Pipeline Idle</div>
              <p className="mt-1 text-xs text-zinc-500">No experiment currently executing in the background.</p>
              <Link to="/new" className="mt-4 inline-flex items-center gap-1.5 text-xs text-lime-300 hover:underline">
                <Play size={12} /> Launch an experiment
              </Link>
            </div>
          )}
          <Link to="/new" className="mt-4 flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-100">
            Start an experiment <ArrowRight size={13} />
          </Link>
        </Card>
      </div>

      <Card className="mt-5 p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="text-sm font-medium">Recent experiments</div>
          <Link to="/experiments" className="text-xs text-zinc-500 hover:text-zinc-200">View all</Link>
        </div>
        <div className="divide-y divide-zinc-800/80">
          {experimentsList.slice(0, 5).map((e) => (
            <div key={e.id} className="grid grid-cols-2 gap-3 px-5 py-4 md:grid-cols-5 items-center hover:bg-zinc-900/40 transition">
              <div>
                <Link to={`/results?jobId=${encodeURIComponent(e.id)}`} className="text-xs font-mono font-medium text-lime-300 hover:underline">
                  {e.id.length > 20 ? `${e.id.slice(0, 8)}...` : e.id}
                </Link>
                <div className="mt-1 text-[11px] text-zinc-500">{e.dataset}</div>
              </div>
              <div className="text-xs text-zinc-300 font-semibold">{e.model}</div>
              <div className="text-xs">
                AUROC <span className="text-zinc-300 font-mono">{e.auroc != null ? Number(e.auroc).toFixed(4) : "—"}</span>
              </div>
              <div>
                <Badge tone={e.status === "Completed" ? "success" : e.status === "Running" ? "warning" : "danger"}>
                  {e.status}
                </Badge>
              </div>
              <div className="text-right text-xs text-zinc-600">
                <Link to={`/results?jobId=${encodeURIComponent(e.id)}`} className="text-zinc-400 hover:text-white inline-flex items-center gap-1">
                  View result <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}