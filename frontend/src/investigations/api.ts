import { useEffect, useState } from "react";

export const detectors: Record<string, string> = {
  robust: "Robust deviation", forest: "Isolation Forest", ensemble: "Rank ensemble", seasonal: "Daily seasonal median"
};
export type Stat = {
  alerts: number; incidents: number; reference?: number; matched?: number; unmatched?: number;
  recall?: number | null; precision?: number | null; f1?: number; false_per_day?: number;
  median_delay_min?: number | null; auroc?: number; average_precision?: number; cutoff: number;
};
export type Profile = { rows: number; features: string[]; kind: string; fit_end: number; cal_end: number;
  val_end: number; cadence: number | null; period: number | null; labeled: boolean };
export type Summary = { profile: Profile; selected: string; cutoff: number; reason: string; incidents: number;
  heldout: Record<string, Stat>; validation: Record<string, Stat[]>; version: string; brief?: {incident:number;status:string} };
export type RunRow = { id: string; name: string; status: string; created: number; finished: number | null;
  source: string | null; attempt: number; incidents: number };
export type Trace = { name: string; attempt: number; status: string; started: number; input: string;
  decision: string | null; duration_ms: number | null; evidence: Record<string, unknown> | null };
export type Run = RunRow & { fingerprint: string; started: number | null; error: string | null; summary: Summary | null;
  stages: { id: string; name: string }[]; trace: Trace[] };
export type IncidentRow = { run_id: string; number: number; name: string; metric: string; start_time: number | null;
  end_time: number | null; count: number; first_record: number; peak_score: number };
export type Overview = { runs: RunRow[]; incidents: IncidentRow[]; counts: Record<string, number>;
  total_incidents: number; offset: number };
export type Point = { record: number; time: number | null; value: number; center: number; low: number;
  high: number; score: number; flagged: boolean };
type EvidenceFact = {key:string; label:string; value:number; evidence:string};
type Brief = {model:string; status:string; reason?:string; claims:EvidenceFact[]; baseline:EvidenceFact[];
  elapsed_ms:number; rejected:number; next_check:string|null; tools:string[]};
export type Detail = { id: number; metric: string; count: number; observed: number; expected: number;
  low: number; high: number; start_time: number | null; end_time: number | null; duration_min: number | null;
  peak_score: number; first_record: number; last_record: number; peak_record: number;
  logs: { time: number; message: string }[]; log_count: number; points: Point[]; brief?:Brief };
export type Incident = { detail: Detail; run: {id: string; name: string; source: string | null}; selected: string; cutoff: number };
export type Dataset = { id: string; name: string; rows: number; evaluated: number; url: string; file_sha256: string;
  selected: string; reason: string; cutoff: number; metrics: Record<string, Stat>; validation: Record<string, Stat[]>;
  example: Detail | null };
export type Benchmark = { version: string; packages: Record<string, string>; datasets: Dataset[] };
export type Mapping = { timestamp: string | null; label: string | null; features: string[] };
export type Preview = { mapping: Mapping; columns: string[]; rows: number; sample: string[][] };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch("/api" + path, init);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${response.status}).`);
  }
  return response.json();
}

export function sampleRun(sample: string, localBrief=false) {
  return api<{id: string}>("/runs", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({sample, local_brief:localBrief}) });
}

export function useResource<T>(path: string, interval = 0, finished?: (data: T) => boolean) {
  const [state, setState] = useState<{path: string; data?: T; error?: string}>({path});
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const data = await api<T>(path, {signal: controller.signal});
        if (controller.signal.aborted) return;
        setState({path, data});
        if (finished?.(data)) return;
      } catch (e) {
        if (controller.signal.aborted) return;
        setState(previous => ({...previous, path, data: previous.path === path ? previous.data : undefined,
          error: e instanceof Error ? e.message : "Unable to connect."}));
      }
      if (interval) timer = setTimeout(load, interval);
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [path, interval, finished, generation]);
  return {data: state.path === path ? state.data : undefined, error: state.path === path ? state.error : undefined,
    retry: () => setGeneration(n => n + 1)};
}

export const number = (v: number | null | undefined, digits = 2) =>
  v == null ? "—" : v.toLocaleString("en-US", {maximumFractionDigits: digits});
export const percent = (v?: number | null) => v == null ? "—" : number(v * 100, 1) + "%";
export function dateTime(t: number | null, short = false) {
  if (t == null) return "—";
  return new Intl.DateTimeFormat("en-GB", {timeZone: "UTC", month: "short", day: "2-digit",
    ...(short ? {} : {year: "numeric"}), hour: "2-digit", minute:"2-digit", hourCycle:"h23"}).format(new Date(t * 1000));
}
