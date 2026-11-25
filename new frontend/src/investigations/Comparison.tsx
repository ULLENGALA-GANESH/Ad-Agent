import { useState } from "react";
import { ArrowUpRight, FlaskConical } from "lucide-react";
import { Benchmark, detectors, number, percent, Stat, useResource } from "./api";
import { Notice, PageTitle, SampleButton } from "./ui";

export function ComparisonTables({metrics,validation,selected}: {metrics:Record<string,Stat>; validation:Record<string,Stat[]>;selected:string}){
  const [mode,setMode] = useState<"test"|"validation">("test"), [cutoff,setCutoff] = useState(.99);
  const choices = Object.values(validation)[0].map(r=>r.cutoff);
  const rows = Object.entries(metrics).map(([key,stat])=>({key,stat:mode==="test" ? stat : validation[key].find(v=>v.cutoff===cutoff)!}));
  return <section className="lab-panel"><div className="panel-heading"><h2>Detector comparison</h2>
    <div className="segmented" aria-label="Evaluation partition"><button aria-pressed={mode==="test"} onClick={()=>setMode("test")}>Held-out test</button>
      <button aria-pressed={mode==="validation"} onClick={()=>setMode("validation")}>Validation</button></div></div>
    {mode==="validation" && <label className="threshold-control">Explore validation cutoff <select value={cutoff} onChange={e=>setCutoff(Number(e.target.value))}>
      {choices.map(c=><option key={c} value={c}>{percent(c)}</option>)}</select></label>}
    <div className="lab-table-scroll"><table className="lab-table"><thead><tr><th>Detector</th><th>Cutoff</th><th>Episodes caught</th><th>Unmatched</th><th>Unmatched / day</th><th>Median delay</th><th>Incident F1</th></tr></thead>
      <tbody>{rows.map(({key,stat:m})=><tr key={key} className={key===selected ? "selected-detector":""}><td><strong>{detectors[key]}</strong>{key===selected && <small className="selection-label">Selected</small>}</td>
        <td>{percent(m.cutoff)}</td><td>{m.matched==null ? "—":m.matched+" / "+m.reference}</td><td>{number(m.unmatched)}</td>
        <td>{number(m.false_per_day)}</td><td>{m.median_delay_min==null?"—":number(m.median_delay_min)+" min"}</td><td>{number(m.f1,3)}</td></tr>)}</tbody></table></div>
    <p className="table-note">{mode==="test" ? "Each detector uses its locked operating point. " : "Changing this cutoff only updates the validation view. "}One alert group can match one reference episode. Additional groups count as unmatched.</p></section>;
}

export default function Comparison(){
  const resource=useResource<Benchmark>("/benchmark");
  const [slug,setSlug]=useState("elb-requests");
  const suite=resource.data, item=suite?.datasets.find(d=>d.id===slug);
  return <><PageTitle title="Detector benchmarks" description="Reproducible comparisons on three labeled production metric traces from NAB."/>
    {suite && item ? <>
      <div className="dataset-tabs" aria-label="Benchmark datasets">{suite.datasets.map(c=><button key={c.id} aria-pressed={slug===c.id} onClick={()=>setSlug(c.id)}>{c.name}</button>)}</div>
      <section className="lab-panel benchmark-head"><div><div className="icon-caption"><FlaskConical size={15}/>Fixed benchmark</div><h2>{item.name}</h2>
        <p>{number(item.rows)} observations · {number(item.evaluated)} held out · {percent(item.cutoff)} selected cutoff</p></div><SampleButton sample={item.id}>Reproduce run</SampleButton></section>
      <ComparisonTables key={slug} selected={item.selected} metrics={item.metrics} validation={item.validation}/>
      <div className="overview-grid"><section className="lab-panel lab-panel-body"><h2>Selection decision</h2><p className="decision-model">{detectors[item.selected]}</p><p>{item.reason}</p>
        <div className="split-bar" aria-label="40 percent fit, 20 percent calibration, 20 percent validation, 20 percent test"><i/><i/><i/><i/></div>
        <div className="split-key"><span>Fit 40%</span><span>Calibrate 20%</span><span>Validate 20%</span><span>Test 20%</span></div></section>
        <section className="lab-panel lab-panel-body"><h2>Reproducibility</h2><p>Seed 42 · scikit-learn {suite.packages["scikit-learn"]}</p>
          <code className="command-line">python -m investigations.benchmark --verify</code>
          <a className="text-link" href={item.url} target="_blank" rel="noreferrer">Original dataset <ArrowUpRight size={14}/></a></section></div>
    </> : <Notice error={resource.error} retry={resource.retry}/>}</>;
}
