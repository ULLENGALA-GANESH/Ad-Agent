import type { Experiment, MetricSource } from "../types";

export const API_BASE_URL = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000");

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(init?.headers || {}) }
  });
  if (!response.ok) {
    const details = await response.json().catch(() => null) as { error?: string } | null;
    throw new ApiError(response.status, details?.error || `API request failed: ${response.status}`);
  }
  return response.json();
}

export async function uploadDataset(file: File, kind: "train" | "test" = "train") {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  const response = await fetch(`${API_BASE_URL}/upload`, { method: "POST", body: form });
  if (!response.ok) {
    const details = await response.json().catch(() => null) as { error?: string } | null;
    throw new ApiError(response.status, details?.error || `Upload failed: ${response.status}`);
  }
  return response.json() as Promise<{ path: string; filename: string }>;
}

export const startExperiment = (payload: unknown) =>
  request<{ job_id: string }>("/run", { method: "POST", body: JSON.stringify(payload) });

export const getHealth = () =>
  request<{ status: string; service: string; active_jobs: number; total_jobs: number }>("/health");

export type ExperimentResult = {
  job_id: string;
  status: "completed";
  created_at?: string;
  started_at?: string;
  finished_at?: string;
  duration_seconds?: number | null;
  command?: string;
  independent_test?: boolean;
  train_path?: string;
  test_path?: string;
  error?: string;
  result: {
    algorithm: string;
    metric_source?: MetricSource;
    dataset_train: string;
    dataset_test?: string | null;
    parameters: Record<string, unknown>;
    code: string;
    std_output?: string;
    error_message?: string;
    review_count?: number;
    metrics: {
      auroc?: number | null;
      auprc?: number | null;
    };
  };
};

type PendingExperiment = { job_id: string; status: "running" | "queued" };

export const getExperimentResults = (runId: string) =>
  request<ExperimentResult | PendingExperiment>(`/results/${encodeURIComponent(runId)}`);

export const getExperiments = () =>
  request<Experiment[]>("/experiments");

export const getModels = () =>
  request<Array<{
    name: string;
    type: string;
    compatibility: string;
    auroc: number;
    auprc: number;
    runtime: string;
    status: string;
  }>>("/models");

export const getBenchmarks = () =>
  request<Array<{
    name: string;
    auroc: number;
    auprc: number;
    regret: number;
    success: number;
    failures: number;
    iterations: number;
    latency: number;
    calls: number;
    cost: number;
  }>>("/benchmarks");

export const submitFeedback = (payload: { job_id: string; action: string; feedback: string }) =>
  request<{ status: string }>("/feedback", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export function connectToExperimentLogs(
  runId: string,
  onMessage: (data: string) => void,
  onComplete?: () => void,
  onError?: (err?: unknown) => void
) {
  const source = new EventSource(`${API_BASE_URL}/logs/${runId}`);
  let isClosed = false;

  const close = () => {
    if (!isClosed) {
      isClosed = true;
      source.close();
    }
  };

  source.onmessage = (event) => {
    const data = event.data;
    if (data === "[COMPLETED]" || data === "DONE") {
      close();
      onComplete?.();
      return;
    }
    if (data === "[FAILED]" || data === "FAILED") {
      close();
      onError?.(new Error("Pipeline execution failed"));
      return;
    }
    onMessage(data);
  };

  source.onerror = (err) => {
    if (!isClosed) {
      close();
      onError?.(err);
    }
  };

  return close;
}
