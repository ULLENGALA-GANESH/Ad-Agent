import { useState } from "react";
import { CheckCircle2, FileText, Play, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DatasetUploader from "../components/DatasetUploader";
import { Button, Card, SectionTitle } from "../components/ui";
import { startExperiment, uploadDataset } from "../api/client";

export default function NewExperiment() {
  const navigate = useNavigate();
  const [train, setTrain] = useState<File | null>(null);
  const [test, setTest] = useState<File | null>(null);
  const [requirement, setRequirement] = useState("Detect anomalous behavior in this time-series dataset and identify the most suitable model.");
  const [advanced, setAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!train || loading) return;
    setLoading(true);
    setError(null);
    try {
      const trainUpload = await uploadDataset(train, "train");
      const testUpload = test ? await uploadDataset(test, "test") : undefined;
      const { job_id } = await startExperiment({
        command: requirement,
        train_path: trainUpload.path,
        test_path: testUpload?.path || null,
      });
      navigate(`/live?jobId=${encodeURIComponent(job_id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start experiment");
    } finally {
      setLoading(false);
    }
  };

  return <div className="mx-auto max-w-5xl">
    <SectionTitle eyebrow="Experiment setup" title="New experiment" description="Define the dataset and research question. The multi-agent pipeline will handle profiling, model selection, code generation, review, evaluation, and optimization." />
    <div className="space-y-5">
      <Card><div className="mb-4 flex items-center justify-between"><div><div className="text-sm font-medium">1. Training dataset</div><div className="mt-1 text-xs text-zinc-500">Primary dataset used by the Processor agent.</div></div><FileText size={17} className="text-zinc-600"/></div><DatasetUploader file={train} onFile={setTrain}/></Card>
      <Card><div className="mb-4"><div className="text-sm font-medium">2. Optional test dataset</div><div className="mt-1 text-xs text-zinc-500">Provide an independent test set when available.</div></div><DatasetUploader file={test} onFile={setTest}/>{!test && <div className="mt-4 border border-amber-400/20 bg-amber-400/[.03] p-4 text-xs leading-5 text-amber-200/80"><b className="font-medium text-amber-200">Single-dataset evaluation</b><br/>Training data will be reused for evaluation because no separate test dataset was provided. This is an evaluation mode, not an error.</div>}</Card>
      <Card><div className="mb-4"><div className="text-sm font-medium">3. What would you like to detect?</div><div className="mt-1 text-xs text-zinc-500">Describe the anomaly objective in natural language.</div></div><textarea value={requirement} onChange={e=>setRequirement(e.target.value)} className="min-h-32 w-full resize-y border border-zinc-800 bg-zinc-950/70 p-4 text-sm leading-6 outline-none focus:border-zinc-600" placeholder="Describe the anomaly detection requirement..."/></Card>
      <Card><button onClick={()=>setAdvanced(!advanced)} className="flex w-full items-center justify-between text-left"><div><div className="flex items-center gap-2 text-sm font-medium"><Settings2 size={16}/> Advanced configuration</div><div className="mt-1 text-xs text-zinc-500">Optional controls for model family, mode, optimization, and human review.</div></div><span className="text-xs text-zinc-500">{advanced ? "Hide" : "Configure"}</span></button>{advanced && <div className="mt-5 grid gap-4 border-t border-zinc-800 pt-5 md:grid-cols-2"><label className="text-xs text-zinc-400">Candidate model family<select className="mt-2 w-full border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-200"><option>Automatic</option><option>Temporal</option><option>Tabular</option><option>Deep Learning</option></select></label><label className="text-xs text-zinc-400">Data mode<select className="mt-2 w-full border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-200"><option>Auto-detect</option><option>Time-series</option><option>Tabular</option></select></label><label className="text-xs text-zinc-400">Maximum optimization iterations<input type="number" defaultValue={3} className="mt-2 w-full border border-zinc-800 bg-zinc-950 p-3 text-sm"/></label><label className="flex items-center gap-3 pt-6 text-sm"><input type="checkbox" defaultChecked/> Enable human review</label><label className="flex items-center gap-3 text-sm"><input type="checkbox" defaultChecked/> Evidence-guided selection</label></div>}</Card>
      {error && <div role="alert" className="border border-red-400/30 bg-red-400/[.05] p-4 text-sm text-red-200">{error}</div>}
      <div className="flex justify-end"><Button onClick={run} disabled={!train || loading}>{loading ? "Starting..." : <><Play size={15}/> Run Experiment</>}</Button></div>
    </div>
  </div>;
}