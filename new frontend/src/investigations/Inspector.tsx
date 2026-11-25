import { useEffect, useState } from "react";
import { Check, ChevronRight, Circle, Clock3, GitBranch, Layers3 } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { dateTime, detectors, number, percent, Run, useResource } from "./api";
import { IncidentInbox } from "./Overview";
import { ComparisonTables } from "./Comparison";
import { Notice, PageTitle, Status } from "./ui";

const terminal = (r:Run) => r.status==="completed" || r.status==="failed";

function TracePanel({run}: {run:Run}) {
  const [choice,setChoice]=useState("");
  const current = choice || run.trace.filter(t=>t.status==="running").at(-1)?.name || (run.summary ? "eval":"processor");
  const stage = run.stages.find(s=>s.id===current)!;
  const attempts = run.trace.filter(t=>t.name===current).slice().reverse();
  return <section className="lab-panel"><div className="panel-heading"><h2>Agent trace</h2><div className="icon-caption"><GitBranch size={15}/>LangGraph</div></div>
    <div className="trace-grid"><div className="stage-list">{run.stages.map((s,i)=>{
      const t=run.trace.filter(t=>t.name===s.id).at(-1);
      return <button key={s.id} aria-pressed={s.id===current} onClick={()=>setChoice(s.id)}><span className={"stage-icon stage-"+(t?.status || "waiting")}>{t?.status==="completed"?<Check size={12}/>:i+1}</span>
        <span>{s.name}</span><small>{t?.status || "waiting"}</small><ChevronRight size={14}/></button>;})}</div>
      <div className="trace-detail"><h3>{stage.name}</h3>{attempts.length ? attempts.map(t=><article key={t.attempt}><div className="trace-meta"><Status value={t.status}/><span>Attempt {t.attempt}</span>
        {t.duration_ms!=null && <span>{number(t.duration_ms,1)} ms</span>}</div>
        <dl className="trace-facts"><dt>Input</dt><dd>{t.input}</dd><dt>Decision</dt><dd>{t.decision || "Stage is running."}</dd></dl>
        {t.evidence && <details open={attempts.length===1}><summary>Stage artifact</summary><pre>{JSON.stringify(t.evidence,null,2)}</pre></details>}</article>) : <p>Waiting for this stage.</p>}</div></div></section>;
}
export default function Inspector() {
  const {runId=""}=useParams(), [params,setParams]=useSearchParams(), navigate=useNavigate();
  const q=useResource<Run>("/runs/"+encodeURIComponent(runId),650,terminal);
  const run=q.data, tab=params.get("view") || "trace", open=params.get("open");
  useEffect(()=>{
    if(run?.status==="completed" && open && /^\d+$/.test(open) && +open>0 && +open<=(run.summary?.incidents || 0)){
      navigate(`/investigations/${run.id}/incidents/${open}`,{replace:true});
    }
  },[run,open,navigate]);
  if(!run) return <Notice error={q.error} retry={q.retry}/>;
  const summary=run.summary;
  return <><PageTitle title={run.name} description={"Run "+run.id.slice(0,12)+" · Submitted "+dateTime(run.created)+" UTC"} action={<Status value={run.status}/>}/>
    {q.error && <Notice error={q.error} retry={q.retry}/>}
    {run.error && <div className="lab-alert" role="alert">{run.error}</div>}
    <div className="metric-strip"><div className="metric-tile"><span><Layers3 size={15}/>Records</span><strong>{number(summary?.profile.rows)}</strong></div>
      <div className="metric-tile"><span><GitBranch size={15}/>Stages complete</span><strong>{run.trace.filter(t=>t.status==="completed").length}<small> / 7</small></strong></div>
      <div className="metric-tile"><span><Circle size={15}/>Incidents</span><strong>{number(summary?.incidents)}</strong></div>
      <div className="metric-tile"><span><Clock3 size={15}/>Elapsed</span><strong>{run.started ? number((run.finished || Date.now()/1000)-run.started,2):"—"}<small> s</small></strong></div></div>
    {summary && <div className="selection-strip"><span>Selected detector <b>{detectors[summary.selected]}</b></span><span>Cutoff <b>{percent(summary.cutoff)}</b></span><span>Input <b>{summary.profile.kind}</b></span></div>}
    {summary?.brief && <p className="brief-link"><Link className="text-link" to={`/investigations/${run.id}/incidents/${summary.brief.incident}`}>Review local-model brief · Incident #{summary.brief.incident}</Link></p>}
    <div className="dataset-tabs">{["trace","incidents","comparison"].map(view=><button key={view} aria-pressed={tab===view}
      disabled={!summary && view!=="trace"} onClick={()=>setParams(view==="trace"?{}:{view})}>{({trace:"Agent trace",incidents:"Incidents",comparison:"Model comparison"})[view]}</button>)}</div>
    {summary && tab==="incidents" ? <IncidentInbox key={run.id} run={run.id}/> : summary && tab==="comparison" ?
      <><ComparisonTables selected={summary.selected} metrics={summary.heldout} validation={summary.validation}/><p className="field-hint">{summary.reason}</p></> :
      <TracePanel key={run.id} run={run}/>}
    <details className="run-provenance"><summary>Run provenance</summary><p>Input and configuration fingerprint · SHA-256</p><code>{run.fingerprint}</code></details></>;
}
