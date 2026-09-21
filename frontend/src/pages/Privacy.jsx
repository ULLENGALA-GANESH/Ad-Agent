import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheckIcon,
  TrashIcon,
  LockClosedIcon,
  ServerIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";
import { wipeWorkspace } from "../api/backend";

export default function Privacy({ onBackToStudio }) {
  const [wiping, setWiping] = useState(false);
  const [wipeStatus, setWipeStatus] = useState(null);
  const [confirmModal, setConfirmModal] = useState(false);

  const handleWipe = async () => {
    setWiping(true);
    setConfirmModal(false);
    try {
      const res = await wipeWorkspace();
      setWipeStatus({
        success: true,
        message: res.message || `Purged ${res.deleted_count || 0} temporary artifacts and scripts.`
      });
    } catch (err) {
      setWipeStatus({
        success: false,
        message: "Failed to wipe workspace cache: " + (err.response?.data?.error || err.message)
      });
    } finally {
      setWiping(false);
    }
  };

  const policies = [
    {
      icon: ServerIcon,
      title: "Tenant Isolation & Local Runtime",
      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      description:
        "All telemetry, CCTV video feeds, optical specimen images, and ML training scripts execute locally within your dedicated enterprise container. No raw specimen data is sent to external clouds."
    },
    {
      icon: LockClosedIcon,
      title: "Zero Data Retention Guarantee",
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      description:
        "Specimen uploads and generated intermediate weights are marked as ephemeral. They can be purged automatically post-run or instantly wiped via the 1-click administrative command below."
    },
    {
      icon: CircleStackIcon,
      title: "File Limits & Storage Quotas",
      color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
      description:
        "Per-job file payload ceiling is 500 MB for video/image streams and 250 MB for tabular CSV datasets. Maximum memory consumption per container is capped at 8 GB RAM with automatic OOM throttling."
    },
    {
      icon: DocumentCheckIcon,
      title: "Immutable Compliance Audit Trail",
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      description:
        "Every file ingestion, algorithm execution, alert triage decision, and workspace wipe is cryptographically recorded in an append-only SQLite compliance log for SOC-2 and ISO-27001 audits."
    }
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#070913] to-black text-white p-6 pt-24 pb-16">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
              <span>Enterprise Trust & Security Architecture</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">Data Privacy & Retention Policy</h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Authoritative operational guidelines governing telemetry security, container boundaries, and data lifecycles.
            </p>
          </div>
          {onBackToStudio && (
            <button
              onClick={onBackToStudio}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer shrink-0"
            >
              &larr; Back to Studio
            </button>
          )}
        </div>

        {/* Status Notification Banner if wiped */}
        {wipeStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              wipeStatus.success
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}
          >
            <div className="flex items-center gap-3">
              {wipeStatus.success ? (
                <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
              )}
              <span className="text-xs font-semibold">{wipeStatus.message}</span>
            </div>
            <button
              onClick={() => setWipeStatus(null)}
              className="text-xs opacity-70 hover:opacity-100 underline cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {/* Core Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {policies.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${p.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{p.title}</h3>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{p.description}</p>
              </div>
            );
          })}
        </div>

        {/* Administrative Workspace Purge Section */}
        <div className="backdrop-blur-xl bg-rose-500/[0.03] border border-rose-500/20 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TrashIcon className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Administrative Workspace Purge</h3>
              </div>
              <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
                Immediately delete all generated pipeline scripts, video keyframe extractions, vision heatmaps, and prediction CSVs from the local host storage. This operation is recorded in the compliance audit log.
              </p>
            </div>
            <button
              onClick={() => setConfirmModal(true)}
              disabled={wiping}
              className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {wiping ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>Purging Cache...</span>
                </>
              ) : (
                <>
                  <TrashIcon className="w-4 h-4" />
                  <span>1-Click Purge Cache</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-3 border-t border-rose-500/10 flex flex-wrap items-center gap-4 text-[11px] text-gray-500">
            <span>&bull; Target: <code className="text-gray-400 font-mono">backend/generated_artifacts/*</code></span>
            <span>&bull; Target: <code className="text-gray-400 font-mono">backend/generated_scripts/*</code></span>
            <span>&bull; Database audit records: <span className="text-emerald-400 font-semibold">Preserved</span></span>
          </div>
        </div>

        {/* Specifications Table */}
        <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <DocumentCheckIcon className="w-4 h-4 text-cyan-400" />
            Security & Storage Specifications
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-white/5 text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-3">Dimension</th>
                  <th className="py-2.5 px-3">Enterprise Guarantee</th>
                  <th className="py-2.5 px-3">Compliance Standard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                <tr>
                  <td className="py-2.5 px-3 font-sans font-semibold text-white">Execution Isolation</td>
                  <td className="py-2.5 px-3 text-cyan-300">Sandboxed Subprocess (Zero internet egress for data)</td>
                  <td className="py-2.5 px-3 text-gray-400">SOC-2 Type II / HIPAA BAA</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-semibold text-white">Supported File Types</td>
                  <td className="py-2.5 px-3 text-cyan-300">CSV, Parquet, TSV, MP4, AVI, PNG, JPG, PT, MAT</td>
                  <td className="py-2.5 px-3 text-gray-400">Multi-Modality Ingestion Spec</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-semibold text-white">Maximum Upload Size</td>
                  <td className="py-2.5 px-3 text-cyan-300">500 MB (Video Streams) • 250 MB (Tabular Datasets)</td>
                  <td className="py-2.5 px-3 text-gray-400">High-Throughput Streaming</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-semibold text-white">Data Retention Default</td>
                  <td className="py-2.5 px-3 text-cyan-300">7 Days Ephemeral or Immediate Administrative Wipe</td>
                  <td className="py-2.5 px-3 text-gray-400">GDPR Article 17 (Right to Erasure)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 backdrop-blur-md bg-black/70 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="backdrop-blur-3xl bg-gray-950 border border-rose-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ExclamationTriangleIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Confirm Workspace Cache Wipe?</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                This will delete all temporary video keyframe images, vision defect heatmaps, and generated Python scripts from disk. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleWipe}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all cursor-pointer"
              >
                Yes, Purge Files
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
