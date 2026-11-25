import { ArrowLeft, GitBranch, ListTree, Radio, ScanLine } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { dateTime, detectors, Incident as IncidentData, number, percent, useResource } from "./api";
import SignalChart from "./SignalChart";
import { Notice, PageTitle } from "./ui";

export default function Incident(){
  const {runId="",number:incident=""}=useParams();
  const q=useResource<IncidentData>(`/runs/${encodeURIComponent(runId)}/incidents/${encodeURIComponent(incident)}`);
  if(!q.data) return <Notice error={q.error} retry={q.retry}/>;
  const {detail:d,run,selected,cutoff}=q.data;
  const when=d.start_time!=null ? dateTime(d.start_time)+" UTC" : "Record "+d.first_record;
  return <><Link className="back-link" to={"/investigations/"+run.id+"?view=incidents"}><ArrowLeft size={14}/>Run incidents</Link>
    <PageTitle title={d.metric+" anomaly"} description={run.name+" · Incident #"+d.id+" · "+when}
      action={<Link className="lab-btn" to={"/investigations/"+run.id}><GitBranch size={16}/>Inspect run</Link>}/>
    <div className="investigation-grid"><section className="lab-panel"><div className="panel-heading"><h2>Incident timeline</h2><span className="icon-caption"><Radio size={14}/>{d.metric}</span></div>
      <SignalChart detail={d}/></section>
      <section className="lab-panel evidence-summary"><div className="panel-heading"><h2>Alert summary</h2><ScanLine size={16}/></div><dl>
        <dt>Detector</dt><dd>{detectors[selected]}</dd><dt>Peak calibrated rank</dt><dd>{percent(d.peak_score)}</dd>
        <dt>Alert cutoff</dt><dd>{percent(cutoff)}</dd><dt>Alerted observations</dt><dd>{number(d.count)}</dd>
        <dt>First to last alert</dt><dd>{d.duration_min==null ? "Independent row" : number(d.duration_min)+" min"}</dd>
      </dl></section></div>
    <div className="overview-grid"><section className="lab-panel"><div className="panel-heading"><h2>Investigation evidence</h2><ListTree size={16}/></div>
      <div className="evidence-entry"><span>E1</span><div><h3>Largest feature deviation</h3><p>At record {number(d.peak_record)}, {d.metric} measured <b>{number(d.observed,5)}</b>. Its fitting median was <b>{number(d.expected,5)}</b> and the central 90% range was {number(d.low,5)} to {number(d.high,5)}.</p></div></div>
      <div className="evidence-entry"><span>E2</span><div><h3>Alert window</h3><p>The first alert occurred at {when}. {number(d.count)} {d.count===1?"observation met":"consecutive observations met"} the {percent(cutoff)} cutoff. The highest detector rank in this episode was {percent(d.peak_score)}.</p></div></div>
      <p className="table-note">The detector identifies unusual observations. Confirm the underlying cause using independent operational evidence.</p>
      </section><section className="lab-panel"><div className="panel-heading"><h2>Related log events</h2><span className="small-count">{d.log_count}</span></div>
        {d.logs.length ? <ul className="log-list">{d.logs.map((l,i)=><li key={i}><small>{dateTime(l.time)} UTC</small><p>{l.message}</p></li>)}</ul> :
          <p className="lab-empty">No supplied log entries match this alert window.</p>}
        {d.log_count>d.logs.length && <p className="table-note">Showing the first {d.logs.length} matches.</p>}</section></div>
    {d.brief && <section className="lab-panel"><div className="panel-heading"><h2>Local-model evidence review</h2><span className="plot-unit">{d.brief.model}</span></div>
      <div className="lab-panel-body"><p>{d.brief.reason || `${d.brief.claims.length} verified claims · ${d.brief.rejected} rejected · ${number(d.brief.elapsed_ms/1000)} s`}</p>
      {d.brief.claims.map(f=><p key={f.key}><b>{f.label} · {number(f.value,5)}</b> · {f.evidence}</p>)}
      {d.brief.next_check && <p>Suggested check · {d.brief.next_check}</p>}
      <details className="run-provenance"><summary>Compare deterministic brief</summary>
        {d.brief.baseline.map(f=><p key={f.key}>{f.label} · {number(f.value,5)} · {f.evidence}</p>)}</details></div></section>}
    </>;
}
