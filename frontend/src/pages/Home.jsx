import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FileUpload from "../components/FileUpload";
import { runPipeline, fetchBenchmarks } from "../api/backend";
import {
  PlayIcon,
  SparklesIcon,
  DocumentCheckIcon,
  VideoCameraIcon,
  PhotoIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  HeartIcon,
  ChartBarIcon,
  BoltIcon,
  ShareIcon
} from "@heroicons/react/24/solid";
import { ArrowTopRightOnSquareIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

export default function Home({ setJobId, trainPath, testPath }) {
  const [selectedModality, setSelectedModality] = useState("all");
  const [cmd, setCmd] = useState("Analyze CCTV surveillance feed for unusual optical motion and spatial background deviation");
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState("cctv_perimeter");
  const [datasetLoadedName, setDatasetLoadedName] = useState("data/cctv_perimeter_breach.mp4");

  const MODALITIES = [
    { id: "all", label: "All Modalities", icon: SparklesIcon, count: "5 Presets" },
    { id: "video", label: "Video Surveillance", icon: VideoCameraIcon, count: "CCTV / Motion" },
    { id: "vision", label: "Computer Vision", icon: PhotoIcon, count: "Surface Defects" },
    { id: "timeseries", label: "Time-Series IoT", icon: CpuChipIcon, count: "Turbines / Pumps" },
    { id: "tabular", label: "Tabular & FinTech", icon: ShieldCheckIcon, count: "Payment Velocity" },
    { id: "graph", label: "Graph Networks", icon: ShareIcon, count: "AML Fraud Rings" }
  ];

  const BENCHMARKS = [
    {
      id: "cctv_perimeter",
      modality: "video",
      title: "CCTV Unusual Motion Detection",
      subtitle: "Use Case #2: Physical Security & Smart Cities",
      filename: "data/cctv_perimeter_breach.mp4",
      path: "data/cctv_perimeter_breach.mp4",
      badge: "Video Feed",
      badgeColor: "rose",
      metrics: "10.0s Feed • 20 FPS • 200 Frames",
      directive: "Analyze CCTV surveillance feed for unusual optical motion and spatial background deviation",
      description: "Flags unusual optical motion patterns for analyst review (frame differencing & temporal background deviation)."
    },
    {
      id: "pcb_defect",
      modality: "vision",
      title: "High-Precision PCB Micro-Defect Inspection",
      subtitle: "Use Case #1: Manufacturing Quality Control",
      filename: "data/pcb_defect_sample.png",
      path: "data/pcb_defect_sample.png",
      badge: "Computer Vision",
      badgeColor: "purple",
      metrics: "600x400 Optical Specimen",
      directive: "Inspect PCB specimen for surface solder bridges, trace fractures, and micro-defects",
      description: "PatchCore morphological variance field isolating micro-crack regions and surface solder defects."
    },
    {
      id: "pump_sensor",
      modality: "timeseries",
      title: "Industrial Turbine & Pump Telemetry",
      subtitle: "Use Case #5: Industrial Machinery & Predictive Maintenance",
      filename: "data/pump_sensor_telemetry.csv",
      path: "data/pump_sensor_telemetry.csv",
      badge: "Time-Series",
      badgeColor: "emerald",
      metrics: "720 Telemetry Records",
      directive: "Detect multi-sensor vibration spikes and hydraulic cavitation on pump_sensor_telemetry.csv",
      description: "AutoEncoder time-series profiling axial vibration, hydraulic pressure, and thermal cavitation distress."
    },
    {
      id: "fintech_aml",
      modality: "tabular",
      title: "FinTech High-Frequency Account Velocity",
      subtitle: "Use Case #3: Financial Fraud & Payment Anomalies",
      filename: "data/fintech_transactions_labeled.csv",
      path: "data/fintech_transactions_labeled.csv",
      badge: "FinTech Tabular",
      badgeColor: "cyan",
      metrics: "600 Transactions (4 Features)",
      directive: "Run IForest on fintech_transactions_labeled.csv with contamination=0.10 and isolate high-velocity outliers",
      description: "Isolates transaction velocity surges, cross-border structurings, and device risk anomalies."
    },
    {
      id: "graph_aml",
      modality: "graph",
      title: "Graph Networks / AML Fraud Rings",
      subtitle: "Use Case #4: Relational Graph & Multi-Hop Laundering",
      filename: "data/aml_graph_transactions.csv",
      path: "data/aml_graph_transactions.csv",
      badge: "Graph Network",
      badgeColor: "violet",
      metrics: "500 Nodes • 6 Relational Metrics",
      directive: "Run PyGOD DOMINANT on aml_graph_transactions.csv with contamination=0.08 to detect smurfing rings and cycles",
      description: "Relational graph cycle depth, high-degree smurfing rings, and anomalous clustering coefficients."
    }
  ];

  // Set default on initial mount
  useEffect(() => {
    trainPath.current = "data/cctv_perimeter_breach.mp4";
    testPath.current = "data/cctv_perimeter_breach.mp4";
  }, []);

  const loadBenchmark = (b) => {
    setActivePreset(b.id);
    trainPath.current = b.path;
    testPath.current = b.path;
    setDatasetLoadedName(b.filename);
    setCmd(b.directive);
  };

  const start = async () => {
    setLoading(true);
    const train = trainPath.current || "data/cctv_perimeter_breach.mp4";
    const test = testPath.current || train;
    try {
      const id = await runPipeline(cmd, train, test);
      setJobId(id);
    } catch (e) {
      console.error(e);
      alert("Failed to start pipeline: " + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

  const filteredBenchmarks =
    selectedModality === "all"
      ? BENCHMARKS
      : BENCHMARKS.filter((b) => b.modality === selectedModality);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#070913] to-black flex justify-center items-center p-6 pt-24 pb-16 relative overflow-hidden">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30 pointer-events-none" />

      {/* Decorative Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-cyan-500/10 via-rose-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative w-full max-w-6xl z-10 space-y-8"
      >
        {/* Header Hero */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-rose-500/15 via-cyan-500/15 to-purple-500/15 border border-white/15 rounded-full backdrop-blur-xl shadow-lg shadow-cyan-500/5"
          >
            <SparklesIcon className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-rose-300 to-purple-300 tracking-wider uppercase">
              Unified Multimodal Anomaly Studio
            </span>
          </motion.div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white">
            Autonomous Anomaly Intelligence{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-rose-400 to-indigo-400">
              Across Any Modality.
            </span>
          </h1>

          <p className="text-gray-400 text-sm sm:text-base max-w-3xl mx-auto leading-relaxed">
            Detect security breaches in <span className="text-rose-400 font-semibold">CCTV Surveillance</span>, defects in <span className="text-purple-400 font-semibold">Computer Vision</span>, failures in <span className="text-emerald-400 font-semibold">IoT Time-Series</span>, and fraud in <span className="text-cyan-400 font-semibold">FinTech Tabular</span> telemetry. Zero code required.
          </p>
        </div>

        {/* Studio Panel */}
        <div className="backdrop-blur-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.01] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
          
          {/* Top Modality Selector Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <BoltIcon className="w-3.5 h-3.5 text-cyan-400" />
                Select Industry Modality
              </label>
              <span className="text-[11px] text-gray-500">Autonomous multi-agent routing</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {MODALITIES.map((m) => {
                const Icon = m.icon;
                const active = selectedModality === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedModality(m.id)}
                    className={`p-3 rounded-2xl border text-left transition-all duration-300 cursor-pointer flex flex-col gap-1.5 ${
                      active
                        ? "bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-purple-500/20 border-cyan-400/60 text-white shadow-lg shadow-cyan-500/10 scale-[1.02]"
                        : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className={`w-5 h-5 ${active ? "text-cyan-300" : "text-gray-400"}`} />
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold truncate text-white">{m.label}</p>
                      <p className="text-[10px] text-gray-400 truncate">{m.count}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1-Click Benchmark Library Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <DocumentCheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                5 Benchmark Presets Covering 10 Use Cases
              </label>
              <span className="text-[11px] text-cyan-400 font-medium">Click to load and test instantly</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredBenchmarks.map((b) => {
                const active = activePreset === b.id;
                const badgeColorClass =
                  b.badgeColor === "rose"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                    : b.badgeColor === "purple"
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                    : b.badgeColor === "emerald"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : b.badgeColor === "amber"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : b.badgeColor === "violet"
                    ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                    : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";

                return (
                  <motion.button
                    key={b.id}
                    type="button"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => loadBenchmark(b)}
                    className={`p-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                      active
                        ? "bg-gradient-to-br from-white/[0.09] to-white/[0.03] border-cyan-400/60 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-400/40"
                        : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    {active && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColorClass}`}>
                          {b.badge}
                        </span>
                        {active && (
                          <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                            ACTIVE
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">
                          {b.title}
                        </h4>
                        <p className="text-[11px] text-gray-400 line-clamp-1">{b.subtitle}</p>
                      </div>

                      <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                        {b.description}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                      <span className="text-gray-400 font-mono text-[10px] truncate max-w-[170px]">{b.metrics}</span>
                      <span className="text-cyan-300 font-semibold flex items-center gap-1 group-hover:underline">
                        Select Preset &rarr;
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Drag & Drop Universal Specimen Dropzone */}
          <div className="pt-2 border-t border-white/5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FileUpload
                label="Primary Dataset or Video Feed"
                subtext="Supports CSV, MP4, PNG/JPG, Parquet, and relational tabular feeds."
                onUploaded={(p) => {
                  trainPath.current = p;
                  setDatasetLoadedName(p);
                  setActivePreset("custom");
                }}
              />
              <FileUpload
                label="Ground Truth / Evaluation Dataset (Optional)"
                subtext="Optional labeled dataset used to calculate accuracy metrics (AUROC, AUPRC, F1)."
                onUploaded={(p) => (testPath.current = p)}
              />
            </div>
          </div>

          {/* Active Dataset Indicator Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs">
            <div className="flex items-center gap-2.5">
              <DocumentCheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-gray-400">Target Specimen / Feed:</span>
              <span className="font-mono text-cyan-300 font-bold truncate max-w-[320px]">{datasetLoadedName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 font-mono text-[10px] border border-emerald-500/20">
                READY FOR INGESTION
              </span>
            </div>
          </div>

          {/* Pipeline Natural Language Prompt Directive */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-200 tracking-wide uppercase flex items-center gap-1.5">
                <SparklesIcon className="w-3.5 h-3.5 text-purple-400" />
                Natural Language Pipeline Directive
              </label>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Quick Prompt:</span>
                <button
                  type="button"
                  onClick={() => setCmd("Analyze CCTV surveillance feed for unusual optical motion and spatial background deviation")}
                  className="hover:text-rose-300 transition-colors text-[11px]"
                >
                  CCTV Video
                </button>
                &bull;
                <button
                  type="button"
                  onClick={() => setCmd("Inspect PCB circuit board for hairline fractures, solder bridges, and surface defects")}
                  className="hover:text-purple-300 transition-colors text-[11px]"
                >
                  Vision Defects
                </button>
                &bull;
                <button
                  type="button"
                  onClick={() => setCmd("Run IForest on fintech_transactions_labeled.csv with contamination=0.10 and explain fraud drivers")}
                  className="hover:text-cyan-300 transition-colors text-[11px]"
                >
                  FinTech AML
                </button>
                &bull;
                <button
                  type="button"
                  onClick={() => setCmd("Run PyGOD DOMINANT on aml_graph_transactions.csv with contamination=0.08 to detect smurfing rings and cycles")}
                  className="hover:text-violet-300 transition-colors text-[11px]"
                >
                  Graph AML
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all resize-none font-medium"
              placeholder="Describe your detection objective in plain English (e.g. 'Isolate surface defect heatmaps' or 'Detect unauthorized physical breach in CCTV feed')..."
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
            />
          </div>

          {/* Trigger Pipeline Button */}
          <motion.button
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            disabled={loading}
            onClick={start}
            className="w-full relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl shadow-xl shadow-cyan-500/20 cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-indigo-600 to-rose-600" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-indigo-500 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative py-4 sm:py-5 px-6 flex items-center justify-center gap-3">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-white text-base font-bold">Orchestrating 7 Autonomous Agents...</span>
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5 text-white" />
                  <span className="text-white text-base font-bold tracking-wide">
                    Trigger Autonomous Multimodal Pipeline
                  </span>
                </>
              )}
            </div>
          </motion.button>

          {/* Active Agents Footer Indicator */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span>7 Coordinated Agents</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-rose-400 rounded-full animate-pulse" />
              <span>CCTV Video & Vision Heatmaps</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              <span>Subprocess Sandbox</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
              <span>XAI SHAP & Attribution</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
