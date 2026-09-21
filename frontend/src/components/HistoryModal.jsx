import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchHistory } from "../api/backend";
import {
  XMarkIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  EyeIcon,
  CommandLineIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

export default function HistoryModal({ isOpen, onClose, onSelectJob, onSelectConsole }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingJobId, setLoadingJobId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchHistory();
      setRuns(data);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (jobId) => {
    setLoadingJobId(jobId);
    try {
      if (onSelectJob) {
        await onSelectJob(jobId);
      }
      onClose();
    } catch (err) {
      console.error("Failed to open results for job:", err);
    } finally {
      setLoadingJobId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl backdrop-blur-3xl bg-gray-950/95 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ClockIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Pipeline Execution History</h3>
              <p className="text-xs text-gray-400">Click any completed run to instantly open its Results Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadHistory}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              title="Refresh"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Runs List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-400">Loading audit history...</p>
            </div>
          ) : runs.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              No previous job executions recorded in this workspace.
            </div>
          ) : (
            runs.map((r) => {
              let metrics = {};
              try {
                if (r.metrics_json) metrics = JSON.parse(r.metrics_json);
              } catch (e) {}

              const isCompleted = r.status === "completed" || (!r.status && metrics.auroc);
              const isRunning = r.status === "running";
              const isFailed = r.status === "failed";

              return (
                <div
                  key={r.id}
                  onClick={() => {
                    if (isCompleted) handleSelect(r.id);
                  }}
                  className={`p-4 rounded-2xl bg-white/[0.03] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCompleted
                      ? "border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.06] cursor-pointer"
                      : "border-white/10"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-extrabold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {r.algorithm || "AutoML"}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {r.dataset_train ? r.dataset_train.split(/[/\\]/).pop() : "dataset.csv"}
                      </span>
                      <span className="text-[10px] text-gray-500">{r.created_at}</span>
                    </div>
                    <p className="text-xs text-gray-300 italic truncate max-w-md">
                      &ldquo;{r.command || "Autonomous Pipeline Run"}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    {metrics.auroc !== undefined && (
                      <div className="text-right">
                        <span className="text-gray-500 text-[10px] block">AUROC</span>
                        <span className="text-emerald-400 font-bold">{metrics.auroc.toFixed(4)}</span>
                      </div>
                    )}

                    {isCompleted && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(r.id);
                        }}
                        disabled={loadingJobId === r.id}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/10 hover:scale-105 transition-all group"
                      >
                        {loadingJobId === r.id ? (
                          <>
                            <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                            <span>Loading Hub...</span>
                          </>
                        ) : (
                          <>
                            <EyeIcon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                            <span>View Results Hub &rarr;</span>
                          </>
                        )}
                      </button>
                    )}

                    {isRunning && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectConsole) onSelectConsole(r.id);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                        <span>Live Agent Logs</span>
                      </button>
                    )}

                    {isFailed && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-300 border border-red-500/20">
                        <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
