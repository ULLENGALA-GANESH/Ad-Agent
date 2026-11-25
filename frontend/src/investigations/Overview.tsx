import { lazy, Suspense, useState } from "react";
import { Activity, ArrowRight, ChartNoAxesCombined, CheckCheck, Database, Layers3, Plus, Radio, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import { Benchmark, dateTime, number, Overview as OverviewData, useResource } from "./api";
import { IncidentTable, Notice, PageTitle, Pager, RunTable, SampleButton, Status } from "./ui";
const SignalChart = lazy(() => import("./SignalChart"));

export function Overview() {
  const overview = useResource<OverviewData>("/overview", 4000);
  const benchmark = useResource<Benchmark>("/benchmark");
  const featured = benchmark.data?.datasets.find(c=>c.id==="elb-requests");
  const data = overview.data;
  const counts = data?.counts || {};
  const totals = [
    {label:"Investigations",value:data ? Object.values(counts).reduce((a,b)=>a+b,0):null,icon:Layers3},
    {label:"Incidents detected",value:data?.total_incidents,icon:Activity},
    {label:"In progress",value:data ? (counts.running || 0)+(counts.queued || 0):null,icon:Workflow},
    {label:"Completed runs",value:data ? counts.completed || 0:null,icon:CheckCheck}
  ];
  return <><PageTitle title="Investigation overview" description="Inspect signals, investigate alerts, and follow each agent’s decisions."
    action={<Link className="lab-btn primary" to="/analyze"><Plus size={16}/>New investigation</Link>}/>
    {overview.error && <Notice error={overview.error} retry={overview.retry}/>}
    <section className="metric-strip">{totals.map(s=><div className="metric-tile" key={s.label}><span><s.icon size={15}/>{s.label}</span><strong>{number(s.value)}</strong></div>)}</section>
    <div className="overview-grid">
      <section className="lab-panel feature-panel"><div className="panel-heading"><div className="icon-caption"><Radio size={15}/>Sample investigation</div><span className="plot-unit">NAB / AWS</span></div>
        {featured?.example ? <><div className="signal-heading"><h2>{featured.name}</h2><span>{dateTime(featured.example.start_time)} UTC</span></div>
          <Suspense fallback={<div style={{height:188}} role="status">Loading signal chart.</div>}>
            <SignalChart detail={featured.example} compact/>
          </Suspense><div className="feature-bottom"><p><b>{number(featured.example.observed)} requests</b> at the largest deviation<br/><span>Fitting median {number(featured.example.expected)} requests</span></p>
            <SampleButton sample={featured.id} incident={featured.example.id}>Explore incident</SampleButton></div></> :
          <Notice error={benchmark.error} retry={benchmark.retry}/>}
      </section>
      <section className="lab-panel"><div className="panel-heading"><h2>Recent runs</h2><Link className="icon-link" aria-label="View run history" to="/runs"><ArrowRight size={17}/></Link></div>
        {data ? (data.runs.length ? <div className="run-feed">{data.runs.slice(0,4).map(r=><Link key={r.id} to={"/investigations/"+r.id}><span className="feed-icon"><Database size={15}/></span><div><strong>{r.name}</strong><small>{dateTime(r.created,true)} UTC</small></div><Status value={r.status}/></Link>)}</div> :
          <div className="feed-empty"><Database size={24}/><p>No investigations yet</p><small>Explore the sample or upload a CSV to start a run.</small></div>) : <Notice error={overview.error} retry={overview.retry}/>}
        <Link className="bench-shortcut" to="/comparison"><ChartNoAxesCombined size={18}/><span>Detector benchmark</span><ArrowRight size={15}/></Link>
      </section>
    </div>
    <section className="lab-panel"><div className="panel-heading"><h2>Incident inbox</h2><Link className="text-link" to="/incidents">View all <ArrowRight size={14}/></Link></div>
      {data ? <IncidentTable rows={data.incidents.slice(0,5)}/> : <Notice error={overview.error} retry={overview.retry}/>}</section>
  </>;
}

export function IncidentInbox({run}: {run?:string}) {
  const [offset,setOffset] = useState(0);
  const q = useResource<OverviewData>("/overview?offset="+offset+(run ? "&run="+encodeURIComponent(run):""),4000);
  return <>{!run && <PageTitle title="Incident inbox" description="Alert groups from completed investigations, ordered by run."/>}
    <section className="lab-panel"><div className="panel-heading"><h2>{run ? "Run incidents" : "All incidents"}</h2>{q.data && <span className="small-count">{number(q.data.total_incidents)}</span>}</div>
      {q.error && <Notice error={q.error} retry={q.retry}/>}
      {q.data ? <><IncidentTable rows={q.data.incidents}/><Pager offset={offset} count={q.data.total_incidents} onChange={setOffset}/></> : !q.error && <Notice/>}</section></>;
}
export function History() {
  const q = useResource<OverviewData>("/overview",3000);
  return <><PageTitle title="Run history" description="Open an investigation to view its results, stage decisions, and recovery attempts."
    action={<Link to="/analyze" className="lab-btn primary"><Plus size={15}/>New investigation</Link>}/>
    <section className="lab-panel"><div className="panel-heading"><h2>Latest investigations</h2></div>{q.error && <Notice error={q.error} retry={q.retry}/>}
      {q.data ? <RunTable runs={q.data.runs}/> : !q.error && <Notice/>}</section></>;
}
