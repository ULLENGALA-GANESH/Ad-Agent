import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, BrainCircuit, CheckCircle2, Radio, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AgentPipeline from "../components/AgentPipeline";
import LiveConsole from "../components/LiveConsole";
import { Badge, Button, Card, SectionTitle } from "../components/ui";
import { useExperimentSSE } from "../hooks/useExperimentSSE";

const stageNames = ["Processor", "Selector", "Info Miner", "Code Generator", "Reviewer", "Evaluator", "Optimizer"] as const;

function getStages(messages: string[], done: boolean) {
  const completed = stageNames.map((name) => {
    const token = name === "Info Miner" ? "InfoMiner" : name.replace(" ", "");
    return messages.some((message) =>
      message.includes(`[${token}]`) ||
      message.includes(`${name.toUpperCase()} DONE`) ||
      (name === "Optimizer" && (message.includes("DONE") || message.includes("[Finish]")))
    );
  });
  const activeIndex = completed.findIndex((stage) => !stage);
  return stageNames.map((name, index) => ({
    name,
    state: done || completed[index] ? ("completed" as const) : index === activeIndex ? ("running" as const) : ("pending" as const),
    message: done || completed[index] ? "Completed" : index === activeIndex ? "Processing" : "Queued",
  }));
}

export default function LiveExperiment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get("jobId");
  const { messages, connected, isDone, isFailed, error } = useExperimentSSE(jobId || undefined);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    const hasDoneMessage = messages.some((m) => m === "DONE" || m.includes("[COMPLETED]") || m.includes("Optimizer DONE"));
    if (isDone || hasDoneMessage) {
      setDone(true);
      const timer = setTimeout(() => {
        navigate(`/results?jobId=${encodeURIComponent(jobId)}`);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [messages, isDone, jobId, navigate]);

  const logs = messages.length ? messages : ["Waiting for pipeline logs..."];
  const current = getStages(messages, done);

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <SectionTitle
          eyebrow={jobId ? `Run ${jobId}` : "Run unavailable"}
          title="Live experiment console"
          description="Real-time visibility into the seven-agent research pipeline."
        />
        <div className="flex items-center gap-2">
          {done ? (
            <Badge tone="success"><CheckCircle2 size={12}/> Pipeline finished</Badge>
          ) : isFailed ? (
            <Badge tone="danger"><AlertTriangle size={12}/> Execution error</Badge>
          ) : (
            <Badge tone={connected ? "success" : "warning"}><Radio size={12}/> {connected ? "SSE connected" : "Connecting"}</Badge>
          )}
        </div>
      </div>

      {!jobId && (
        <div role="alert" className="mb-5 border border-red-400/30 bg-red-400/[.05] p-4 text-sm text-red-200">
          No experiment ID was provided. <Link to="/new" className="underline ml-2">Start an experiment</Link>
        </div>
      )}

      {isFailed && (
        <div role="alert" className="mb-5 flex items-center justify-between border border-red-400/30 bg-red-400/[.05] p-4 text-sm text-red-200">
          <div>
            <b>Pipeline execution failed:</b> {error || "An error occurred during experiment processing."}
          </div>
          {jobId && (
            <Link to={`/results?jobId=${encodeURIComponent(jobId)}`}>
              <Button variant="outline" className="text-xs">View Failure Details <ArrowRight size={13}/></Button>
            </Link>
          )}
        </div>
      )}

      {done && (
        <div className="mb-5 flex items-center justify-between border border-lime-400/30 bg-lime-400/[.05] p-4 text-sm text-lime-200">
          <div>
            <b>Pipeline completed successfully!</b> Redirecting to results...
          </div>
          {jobId && (
            <Link to={`/results?jobId=${encodeURIComponent(jobId)}`}>
              <Button className="text-xs">Open Results Now <ArrowRight size={13}/></Button>
            </Link>
          )}
        </div>
      )}

      <Card>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Agent pipeline</div>
            <div className="mt-1 text-xs text-zinc-500">
              Processor → Selector → Info Miner → Code Generator → Reviewer → Evaluator → Optimizer
            </div>
          </div>
          <Badge tone={done ? "success" : isFailed ? "danger" : "warning"}>
            {done ? "Completed" : isFailed ? "Failed" : "Running"}
          </Badge>
        </div>
        <AgentPipeline stages={current}/>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <LiveConsole logs={logs}/>
        <Card>
          <div className="flex items-center gap-2 text-sm font-medium">
            <BrainCircuit size={16} className="text-lime-300"/> Current agent reasoning
          </div>
          <motion.div
            key={done ? "done" : isFailed ? "failed" : "run"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 border border-zinc-800 bg-zinc-950/50 p-5"
          >
            <div className="text-[11px] uppercase tracking-widest text-zinc-600">
              {done ? "Optimizer" : isFailed ? "Evaluator Error" : "Pipeline"}
            </div>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              {done
                ? "Pipeline completed. Model evaluated and final results ready."
                : isFailed
                ? "Pipeline execution stopped due to an error. Check console output for full traceback."
                : "The backend is processing the dataset and streaming live updates."}
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs text-zinc-500">
              <Sparkles size={13}/> Live output is sourced from the Flask pipeline.
            </div>
          </motion.div>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="text-lime-300" size={17}/>
          <div>
            <div className="text-sm font-medium">Evaluation policy</div>
            <div className="mt-1 text-xs text-zinc-500">
              If no test dataset was supplied, results are explicitly labeled as single-dataset evaluation.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}