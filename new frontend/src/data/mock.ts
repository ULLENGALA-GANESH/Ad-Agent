import { AgentStage, Experiment } from "../types";

export const stages: AgentStage[] = [
  { name: "Processor", state: "completed", duration: 1200, message: "Schema and dataset profile generated." },
  { name: "Selector", state: "completed", duration: 1840, message: "Evidence-guided candidates ranked." },
  { name: "Info Miner", state: "completed", duration: 960, message: "Relevant model documentation retrieved." },
  { name: "Code Generator", state: "completed", duration: 2240, message: "Training and scoring code generated." },
  { name: "Reviewer", state: "completed", duration: 710, message: "Generated code passed review." },
  { name: "Evaluator", state: "completed", duration: 4820, message: "Metrics computed on evaluation split." },
  { name: "Optimizer", state: "completed", duration: 6120, message: "Final configuration selected." }
];

export const runningStages: AgentStage[] = stages.map((s, i) =>
  i < 3 ? { ...s } : i === 3
    ? { ...s, state: "running", duration: undefined, message: "Generating candidate implementation..." }
    : { ...s, state: "pending", duration: undefined, message: "Waiting for upstream stage." }
);

export const experiments: Experiment[] = [
  { id: "EXP-24091", dataset: "server_telemetry_v4.csv", model: "TFT", auroc: .942, auprc: .811, runtime: "42.8s", status: "Completed", evaluationMode: "Independent test evaluation", date: "2026-09-16" },
  { id: "EXP-24088", dataset: "power_grid_2026.csv", model: "NBEATS", auroc: .917, auprc: .768, runtime: "35.1s", status: "Completed", evaluationMode: "Single-dataset evaluation", date: "2026-09-15" },
  { id: "EXP-24084", dataset: "iot_sensors.csv", model: "TSMixer", auroc: .901, auprc: .733, runtime: "27.4s", status: "Completed", evaluationMode: "Independent test evaluation", date: "2026-09-13" },
  { id: "EXP-24079", dataset: "transactions.csv", model: "Isolation Forest", auroc: .884, auprc: .704, runtime: "11.9s", status: "Completed", evaluationMode: "Independent test evaluation", date: "2026-09-11" },
  { id: "EXP-24074", dataset: "factory_line.csv", model: "AutoEncoder", auroc: .862, auprc: .681, runtime: "18.6s", status: "Completed", evaluationMode: "Single-dataset evaluation", date: "2026-09-09" },
  { id: "EXP-24070", dataset: "network_flow.csv", model: "TFT", auroc: .934, auprc: .793, runtime: "38.2s", status: "Running", evaluationMode: "Independent test evaluation", date: "2026-09-08" }
];

export const models = [
  { name: "TFT", type: "Temporal Fusion Transformer", compatibility: "High", auroc: .942, auprc: .811, runtime: "42.8s", status: "Selected" },
  { name: "NBEATS", type: "Forecasting / Temporal", compatibility: "High", auroc: .917, auprc: .768, runtime: "35.1s", status: "Candidate" },
  { name: "TSMixer", type: "Temporal Mixer", compatibility: "High", auroc: .901, auprc: .733, runtime: "27.4s", status: "Candidate" },
  { name: "Isolation Forest", type: "Tabular / Point Anomaly", compatibility: "Medium", auroc: .884, auprc: .704, runtime: "11.9s", status: "Candidate" }
];

export const logs = [
  "[18:41:02] Processor    Dataset contains 18,420 rows and 12 numerical features.",
  "[18:41:04] Selector     Strong temporal dependence detected.",
  "[18:41:05] Selector     Candidates: NBEATS, TFT, TSMixer.",
  "[18:41:06] Info Miner   Retrieved relevant model documentation.",
  "[18:41:07] Generator    Creating reproducible Python training pipeline.",
  "[18:41:10] Reviewer     Static checks passed; no unsafe imports detected.",
  "[18:41:14] Evaluator    Evaluation split loaded.",
  "[18:41:18] Evaluator    AUROC=0.942 AUPRC=0.811.",
  "[18:41:20] Optimizer    Final configuration accepted."
];

export const performance = [
  { day: "09/01", auroc: .82, auprc: .61 },
  { day: "09/04", auroc: .86, auprc: .65 },
  { day: "09/07", auroc: .84, auprc: .69 },
  { day: "09/10", auroc: .89, auprc: .72 },
  { day: "09/13", auroc: .91, auprc: .75 },
  { day: "09/16", auroc: .94, auprc: .81 }
];

export const benchmarkData = [
  { name: "Baseline AD-AGENT", auroc: .81, auprc: .64, regret: .19, success: 68, failures: 8, iterations: 4, latency: 29, calls: 12, cost: 0.18 },
  { name: "Evidence-Guided AD-AGENT", auroc: .88, auprc: .73, regret: .12, success: 81, failures: 5, iterations: 3, latency: 31, calls: 16, cost: 0.24 },
  { name: "Evidence + Human Feedback", auroc: .92, auprc: .79, regret: .08, success: 89, failures: 3, iterations: 2, latency: 34, calls: 18, cost: 0.29 }
];