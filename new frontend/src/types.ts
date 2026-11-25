export type ExperimentState = "idle" | "uploading" | "running" | "completed" | "failed";
export type StageState = "pending" | "running" | "completed" | "failed";

export type AgentStage = {
  name: string;
  state: StageState;
  duration?: number;
  message: string;
};

export type MetricSource = "unverified" | "script-reported";

export type Experiment = {
  id: string;
  dataset: string;
  model: string;
  auroc: number | null;
  auprc: number | null;
  metric_source?: MetricSource | null;
  runtime: string;
  status: "Completed" | "Running" | "Failed";
  evaluationMode: "Independent test evaluation" | "Single-dataset evaluation";
  date: string;
};

export type PipelineStageName = "Processor" | "Selector" | "Info Miner" | "Code Generator" | "Reviewer" | "Evaluator" | "Optimizer";
