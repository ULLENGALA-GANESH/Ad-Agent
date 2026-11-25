import { ReactNode, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, CircleAlert, LoaderCircle, Play } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { dateTime, IncidentRow, number, percent, RunRow, sampleRun } from "./api";

export function PageTitle({title, description, action}: {title: string; description?: string; action?: ReactNode}) {
  return <header className="lab-page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>;
}
export function Status({value}: {value: string}) {
  return <span className={"lab-status state-" + value}><i/>{value}</span>;
}
export function Notice({error, retry}: {error?: string; retry?: () => void}) {
  if (error) return <div role="alert" className="lab-alert"><CircleAlert size={17}/>{error}
    {retry && <button onClick={retry} className="text-link">Retry</button>}</div>;
  return <div role="status" className="lab-loading"><LoaderCircle size={16} className="spin"/> Loading…</div>;
}
export function SampleButton({sample="elb-requests", incident, children, localBrief=false}: {sample?: string; incident?: number; children?: ReactNode; localBrief?:boolean}) {
  const [busy,setBusy] = useState(false), [error,setError] = useState("");
  const navigate = useNavigate();
  async function start(){
    setBusy(true); setError("");
    try { const r = await sampleRun(sample,localBrief); navigate("/investigations/" + r.id + (incident ? "?open="+incident : "")); }
    catch(e) {setError(e instanceof Error ? e.message : "Sample failed.");}
    finally {setBusy(false);}
  }
  return <div><button className="lab-btn" disabled={busy} onClick={start}>{busy ? <LoaderCircle size={15} className="spin"/> : <Play size={14}/>}
    {children || "Run sample"}</button>{error && <p className="lab-error" role="alert">{error}</p>}</div>;
}
export function IncidentTable({rows}: {rows: IncidentRow[]}) {
  if (!rows.length) return <div className="lab-empty">No incidents in this view. Completed runs list every alert group here.</div>;
  return <div className="lab-table-scroll"><table className="lab-table"><thead><tr><th>Signal / dataset</th><th>First alert · UTC</th><th>Alerted rows</th><th>Peak rank</th><th><span className="sr-only">Inspect</span></th></tr></thead>
    <tbody>{rows.map(i=><tr key={i.run_id+i.number}><td><Link className="cell-title" to={`/investigations/${i.run_id}/incidents/${i.number}`}><i className="signal-dot"/>{i.metric}</Link>
    <span className="cell-sub">{i.name} · #{i.number}</span></td><td className="tabular">{i.start_time == null ? "Row "+i.first_record : dateTime(i.start_time,true)}</td>
    <td>{number(i.count)}</td><td className="lab-mono">{percent(i.peak_score)}</td><td><Link aria-label={"Open incident "+i.number+" in "+i.name} to={`/investigations/${i.run_id}/incidents/${i.number}`} className="icon-link"><ArrowRight size={16}/></Link></td></tr>)}</tbody></table></div>;
}
export function RunTable({runs}: {runs: RunRow[]}) {
  if (!runs.length) return <div className="lab-empty">Your first investigation will appear here.</div>;
  return <div className="lab-table-scroll"><table className="lab-table"><thead><tr><th>Dataset</th><th>Status</th><th>Submitted · UTC</th><th>Incidents</th><th>Attempt</th></tr></thead>
    <tbody>{runs.map(r=><tr key={r.id}><td><Link className="cell-title" to={"/investigations/"+r.id}>{r.name}</Link><span className="cell-sub lab-mono">{r.id.slice(0,8)}</span></td>
      <td><Status value={r.status}/></td><td>{dateTime(r.created,true)}</td><td>{r.status==="completed"?r.incidents:"—"}</td><td>{r.attempt}</td></tr>)}</tbody></table></div>;
}
export function Pager({offset,count,onChange}: {offset:number;count:number;onChange:(n:number)=>void}) {
  return <div className="lab-pager"><span>{count ? `${offset+1}–${Math.min(offset+30,count)} of ${count}` : "0 incidents"}</span>
    <button aria-label="Previous incident page" disabled={offset===0} onClick={()=>onChange(Math.max(0,offset-30))}><ChevronLeft size={16}/></button>
    <button aria-label="Next incident page" disabled={offset+30>=count} onClick={()=>onChange(offset+30)}><ChevronRight size={16}/></button></div>;
}
