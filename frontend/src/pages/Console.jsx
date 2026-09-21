import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchResults } from "../api/backend";
import { CheckCircleIcon, ClockIcon } from "@heroicons/react/24/solid";
import {
  CpuChipIcon,
  MagnifyingGlassIcon,
  DocumentMagnifyingGlassIcon,
  CodeBracketIcon,
  EyeIcon,
  RocketLaunchIcon,
  SparklesIcon,
  CommandLineIcon
} from "@heroicons/react/24/outline";

const STEPS = [
  { key: "PROCESSOR", label: "Command Processor", desc: "Parsing directives and schema", Icon: CpuChipIcon },
  { key: "SELECTOR", label: "Modality & Model Router", desc: "Selecting optimal algorithm", Icon: MagnifyingGlassIcon },
  { key: "INFOMINER", label: "RAG Knowledge Miner", desc: "Grounded parameter retrieval", Icon: DocumentMagnifyingGlassIcon },
  { key: "CODEGEN", label: "Pipeline Code Generator", desc: "Synthesizing standalone script", Icon: CodeBracketIcon },
  { key: "REVIEWER", label: "Isolated Sandbox Reviewer", desc: "Pre-execution syntax validation", Icon: EyeIcon },
  { key: "EVALUATOR", label: "Model Evaluator", desc: "Training and computing metrics", Icon: RocketLaunchIcon },
  { key: "EXPLAINER", label: "XAI Diagnostic Engine", desc: "Root-cause feature attribution", Icon: SparklesIcon },
];

export default function Console({ jobId, setResults, setPage }) {
  const [progress, setProgress] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [logLines, setLogLines] = useState([]);
  const [isFinished, setIsFinished] = useState(false);
  const [hasError, setHasError] = useState(false);
  const logContainerRef = useRef(null);

  useEffect(() => {
    if (!jobId) return;
    const stream = new EventSource(`http://127.0.0.1:8000/logs/${jobId}`);

    stream.onmessage = async (e) => {
      const msg = e.data;
      setLogLines((prev) => [...prev, msg]);

      if (msg.includes("[ERROR]")) {
        setHasError(true);
      }

      if (msg.includes("PROCESSOR DONE")) {
        setProgress((p) => ({ ...p, PROCESSOR: "done" }));
        setCurrentStep(1);
      }
      if (msg.includes("[Selector]")) {
        setProgress((p) => ({ ...p, SELECTOR: "done" }));
        setCurrentStep(2);
      }
      if (msg.includes("[InfoMiner]")) {
        setProgress((p) => ({ ...p, INFOMINER: "done" }));
        setCurrentStep(3);
      }
      if (msg.includes("[CodeGen]")) {
        setProgress((p) => ({ ...p, CODEGEN: "done" }));
        setCurrentStep(4);
      }
      if (msg.includes("[Reviewer]")) {
        setProgress((p) => ({ ...p, REVIEWER: "done" }));
        setCurrentStep(5);
      }
      if (msg.includes("[Evaluator]")) {
        setProgress((p) => ({ ...p, EVALUATOR: "done" }));
        setCurrentStep(6);
      }
      if (msg.includes("[Explainer]")) {
        setProgress((p) => ({ ...p, EXPLAINER: "done" }));
        setCurrentStep(7);
      }

      if (msg.includes("DONE") || msg.includes("[Finish] Completed")) {
        setProgress((p) => ({
          ...p,
          PROCESSOR: "done",
          SELECTOR: "done",
          INFOMINER: "done",
          CODEGEN: "done",
          REVIEWER: "done",
          EVALUATOR: "done",
          EXPLAINER: "done",
        }));
        setIsFinished(true);

        try {
          const r = await fetchResults(jobId);
          if (r && !r.error) {
            setResults(r);
          }
        } catch (err) {
          console.warn("Could not fetch results immediately, will fallback:", err);
        }

        stream.close();
        setTimeout(() => setPage("results"), 1500);
      }
    };

    stream.onerror = (err) => {
      console.warn("EventSource telemetry stream closed or errored:", err);
      stream.close();
    };

    return () => stream.close();
  }, [jobId]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logLines]);

  const getStepStatus = (index) => {
    const step = STEPS[index];
    if (progress[step.key] === "done") return "done";
    if (index === currentStep) return "active";
    return "waiting";
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-[#0a0c1f] to-black flex flex-col justify-center items-center p-6 pt-24 pb-16 relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl relative z-10 space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-full backdrop-blur-xl">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">
              Live Multi-Agent Orchestration
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Constructing Anomaly Pipeline
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Agents are collaborating in real-time across self-healing verification loops.
          </p>
        </div>

        {/* Step Progress Matrix */}
        <div className="backdrop-blur-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {STEPS.map((step, idx) => {
              const status = getStepStatus(idx);
              const Icon = step.Icon;

              return (
                <div
                  key={step.key}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    status === "done"
                      ? "bg-emerald-500/[0.06] border-emerald-500/30 text-white"
                      : status === "active"
                      ? "bg-cyan-500/[0.1] border-cyan-500/40 text-white shadow-lg shadow-cyan-500/15"
                      : "bg-white/[0.02] border-white/5 text-gray-500"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        status === "done"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : status === "active"
                          ? "bg-cyan-500/20 text-cyan-400"
                          : "bg-white/5 text-gray-600"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold">{step.label}</h4>
                        <span className="text-[10px] font-mono opacity-60">Step {idx + 1}/7</span>
                      </div>
                      <p className="text-xs text-gray-400">{step.desc}</p>
                    </div>
                  </div>

                  <div>
                    {status === "done" ? (
                      <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
                    ) : status === "active" ? (
                      <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ClockIcon className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Terminal Stream */}
        <div className="backdrop-blur-2xl bg-black/70 border border-white/10 rounded-2xl p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-mono">Live Telemetry Terminal</span>
            </div>
            <span className="font-mono text-[10px] text-gray-500">Job: {jobId ? jobId.slice(0, 8) : "running"}</span>
          </div>

          <div
            ref={logContainerRef}
            className="font-mono text-xs text-cyan-300/90 h-36 overflow-y-auto space-y-1 pr-2"
          >
            {logLines.length === 0 ? (
              <p className="text-gray-600 italic">Awaiting telemetry stream...</p>
            ) : (
              logLines.map((line, i) => (
                <div key={i} className="leading-relaxed">
                  <span className="text-gray-600 mr-2">&gt;</span>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Completion Action Banner */}
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border border-emerald-500/30 shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircleIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Autonomous Pipeline Execution Succeeded</p>
                <p className="text-xs text-gray-400">Evaluation complete, telemetry validated, and XAI feature attributions generated.</p>
              </div>
            </div>
            <button
              onClick={() => setPage("results")}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/25 hover:scale-105 transition-all shrink-0 cursor-pointer"
            >
              <span>View Results Hub</span>
              <RocketLaunchIcon className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {hasError && !isFinished && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs"
          >
            <span>Telemetry reported an issue during execution. You can inspect logs above or return to Studio.</span>
            <button
              onClick={() => setPage("home")}
              className="px-3 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 font-semibold"
            >
              Return to Studio
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
