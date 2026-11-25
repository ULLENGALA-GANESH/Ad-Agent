import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Code2,
  Database,
  Download,
  ExternalLink,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import CodeViewer from "../components/CodeViewer";
import MetricCard from "../components/MetricCard";
import { Badge, Button, Card, SectionTitle } from "../components/ui";
import { ApiError, ExperimentResult, getExperimentResults } from "../api/client";

function metricValue(value: number | null | undefined) {
  return value == null ? "Unavailable" : value.toFixed(4);
}

export default function Results() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("jobId");
  return <ExperimentResults key={jobId} jobId={jobId}/>;
}

function ExperimentResults({ jobId }: { jobId: string | null }) {
  const [response, setResponse] = useState<ExperimentResult | null>(null);
  const [loading, setLoading] = useState(Boolean(jobId));
  const [stillProcessing, setStillProcessing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);

    getExperimentResults(jobId)
      .then((res) => {
        if (!cancelled) {
          setStillProcessing(res.status !== "completed");
          if (res.status === "completed") setResponse(res);
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setStillProcessing(false);
        if (cause instanceof ApiError) {
          if (cause.status === 404) {
            setNotFound(true);
            setError("Experiment result not found.");
          } else if (cause.status >= 500) {
            setError(`Experiment failed: ${cause.message}`);
          } else {
            setError(cause.message);
          }
        } else {
          setError("Unable to load experiment results. Please verify that the backend is running.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobId, refreshKey]);

  // Auto-retry polling if still processing
  useEffect(() => {
    if (!stillProcessing || !jobId) return;
    if (loading) return;
    const timeout = setTimeout(() => {
      setRefreshKey((k) => k + 1);
    }, 2500);
    return () => clearTimeout(timeout);
  }, [stillProcessing, jobId, loading]);

  // 1. Missing Job ID
  if (!jobId) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400">
          <AlertCircle size={24} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-zinc-100">No experiment job ID was provided.</h2>
        <p className="mt-2 text-sm text-zinc-400">
          To view experiment results, launch an experiment from the setup console or pick a run from experiment history.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/new">
            <Button><Play size={14} /> New Experiment</Button>
          </Link>
          <Link to="/experiments">
            <Button variant="outline">View History</Button>
          </Link>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading && !response && !stillProcessing) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-zinc-900 border border-zinc-700 text-lime-300">
          <Loader2 size={24} className="animate-spin" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-zinc-100">Loading results...</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Retrieving completed metrics and generated code for run <code className="text-zinc-200 font-mono text-xs">{jobId}</code> from backend.
        </p>
      </div>
    );
  }

  // 3. Still Processing State (202)
  if (stillProcessing) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300">
          <Loader2 size={24} className="animate-spin" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-zinc-100">Experiment is still processing</h2>
        <p className="mt-2 text-sm text-zinc-400">
          The agent pipeline is currently training and evaluating the anomaly detection model. Auto-refreshing every 2.5s...
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to={`/live?jobId=${encodeURIComponent(jobId)}`}>
            <Button><Terminal size={14} /> View Live Console</Button>
          </Link>
          <Button variant="outline" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw size={14} /> Check Now
          </Button>
        </div>
      </div>
    );
  }

  // 4. Not Found (404) or General Error
  if (notFound || error || !response) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-400/10 border border-red-400/20 text-red-300">
          <AlertCircle size={24} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-zinc-100">
          {notFound ? "Experiment result not found." : "Unable to load experiment results."}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {error || "Verify that the backend is running at http://127.0.0.1:8000 and that the experiment completed."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw size={14} /> Retry
          </Button>
          <Link to="/experiments">
            <Button variant="outline">Browse History</Button>
          </Link>
          <Link to="/new">
            <Button variant="outline"><Play size={14} /> Start New</Button>
          </Link>
        </div>
      </div>
    );
  }

  const result = response.result || {};
  const reported = result.metric_source === "script-reported";
  const metrics = reported ? result.metrics || {} : {};
  const hasTest = response.independent_test ?? Boolean((result.dataset_test || response.test_path) && (result.dataset_test || response.test_path) !== (result.dataset_train || response.train_path));
  const evaluation = hasTest ? "Independent test evaluation" : "Single-dataset evaluation";
  const durationText = response.duration_seconds != null ? `${response.duration_seconds.toFixed(1)}s` : "Complete";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link to="/experiments" className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
              <ArrowLeft size={13} /> Experiments
            </Link>
            <span className="text-xs text-zinc-600">/</span>
            <span className="text-xs font-mono text-lime-300">RUN-{response.job_id.slice(0, 8)}</span>
          </div>
          <SectionTitle
            eyebrow={`Job ID: ${response.job_id}`}
            title={`Results: ${result.algorithm || "Model Evaluation"}`}
            description={reported ? "The generated research script reported the metrics shown here." : "This saved research run has unverified metrics. Its execution details and original output are available below."}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setRefreshKey((k) => k + 1)} className="text-xs py-1.5 px-3">
            <RefreshCw size={13} /> Refresh
          </Button>
          <Badge tone={response.status === "completed" ? "success" : "danger"}>
            {response.status === "completed" ? "Completed" : response.status}
          </Badge>
          <Badge tone="neutral">
            <Clock size={11} className="mr-1 inline" /> {durationText}
          </Badge>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="AUROC Score"
          value={metricValue(metrics.auroc)}
        />
        <MetricCard
          label="AUPRC Score"
          value={metricValue(metrics.auprc)}
        />
        <MetricCard
          label="Selected Model"
          value={result.algorithm || "Unavailable"}
          delta="Automated pick"
        />
        <MetricCard
          label="Evaluation Mode"
          value={hasTest ? "Independent" : "Single dataset"}
          delta={hasTest ? "Train/Test split" : "Reused training data"}
        />
        <MetricCard
          label="Execution Time"
          value={durationText}
          delta={response.finished_at ? response.finished_at.slice(11, 19) + " UTC" : "Done"}
        />
      </div>

      {/* Execution Details & Model Info */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="text-sm font-medium flex items-center gap-2">
              <Database size={16} className="text-lime-300" /> Execution details
            </div>
            <Badge tone="neutral">{evaluation}</Badge>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {[
              ["Job ID", response.job_id],
              ["Command prompt", response.command || "Anomaly detection run"],
              ["Training dataset", result.dataset_train || response.train_path || "Provided dataset"],
              ["Test dataset", result.dataset_test || response.test_path || "None (single-dataset mode)"],
              ["Started at", response.started_at ? response.started_at.replace("T", " ").slice(0, 19) : "N/A"],
              ["Finished at", response.finished_at ? response.finished_at.replace("T", " ").slice(0, 19) : "N/A"],
              ["Review iterations", String(result.review_count ?? 0)],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1 border-b border-zinc-800/60 pb-2.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
                <span className="break-all text-xs font-mono text-zinc-300">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="text-sm font-medium flex items-center gap-2">
              <Layers size={16} className="text-lime-300" /> Model parameters
            </div>
          </div>
          <div className="mt-4">
            <div className="border border-lime-400/20 bg-lime-400/[.03] p-4">
              <div className="text-[10px] uppercase tracking-widest text-lime-300">Selected Algorithm</div>
              <div className="mt-1 text-xl font-semibold text-zinc-100">{result.algorithm || "Unavailable"}</div>
              <div className="mt-4 text-[10px] uppercase tracking-widest text-zinc-500">Parameters Dictionary</div>
              <pre className="mt-1.5 max-h-48 overflow-auto rounded bg-zinc-950/80 p-3 text-xs leading-5 font-mono text-zinc-300 border border-zinc-800">
                {JSON.stringify(result.parameters || {}, null, 2)}
              </pre>
            </div>
          </div>
        </Card>
      </div>

      {/* Real Standard Output Execution Log */}
      {result.std_output && (
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-950/70">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
              <Terminal size={14} className="text-lime-300" />
              <span>Model execution standard output</span>
            </div>
          </div>
          <pre className="console-scroll max-h-56 overflow-auto bg-[#08080a] p-4 font-mono text-xs leading-6 text-zinc-300">
            {result.std_output}
          </pre>
        </Card>
      )}

      {/* Generated Code Section */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-950/70">
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-lime-300" />
            <div>
              <div className="text-sm font-medium">Generated Python code</div>
              <div className="text-[11px] text-zinc-500">Autonomous training and scoring script produced by Code Generator.</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="neutral">Python 3</Badge>
            {result.code && (
              <a
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(result.code)}`}
                download={`${result.algorithm || "experiment"}.py`}
                className="inline-flex items-center gap-1.5 border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 hover:text-white"
              >
                <Download size={13} /> Download .py
              </a>
            )}
          </div>
        </div>
        <div className="p-4">
          {result.code ? (
            <CodeViewer code={result.code} />
          ) : (
            <div className="p-8 text-center text-sm text-zinc-500">
              No code artifact returned for this experiment.
            </div>
          )}
        </div>
      </Card>

      {/* Navigation Links */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-4 text-xs">
          <Link to="/models" className="text-zinc-400 hover:text-lime-300 underline">
            Inspect model evidence
          </Link>
          <Link to="/experiments" className="text-zinc-400 hover:text-lime-300 underline flex items-center gap-1">
            Experiment history <ExternalLink size={12} />
          </Link>
          <Link to="/benchmarks" className="text-zinc-400 hover:text-lime-300 underline">
            Benchmark comparisons
          </Link>
        </div>
        <Link to="/new">
          <Button><Play size={14} /> Start Another Experiment</Button>
        </Link>
      </div>
    </div>
  );
}
