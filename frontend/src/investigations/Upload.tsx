import { useRef, useState } from "react";
import { ArrowRight, FileSpreadsheet, Files, LoaderCircle, UploadCloud } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api, Benchmark, Mapping, number, Preview, useResource } from "./api";
import { Notice, PageTitle, SampleButton } from "./ui";

export default function Upload() {
  const navigate = useNavigate();
  const [file,setFile] = useState<File>(), [logs,setLogs] = useState<File>();
  const [preview,setPreview] = useState<Preview>(), [mapping,setMapping] = useState<Mapping>();
  const [busy,setBusy] = useState(""), [error,setError] = useState("");
  const [localBrief,setLocalBrief] = useState(false);
  const rev = useRef(0);
  const samples = useResource<Benchmark>("/benchmark");
  async function choose(f?:File) {
    const current = ++rev.current;
    setFile(f); setLogs(undefined); setPreview(undefined); setMapping(undefined); setError(""); setBusy("");
    if (!f) return;
    if(f.size > 2_000_000) {setError("CSV exceeds 2 MB."); return;}
    setBusy("Profiling CSV");
    try {
      const form = new FormData(); form.append("file",f);
      const result = await api<Preview>("/preview",{method:"POST",body:form});
      if (current===rev.current) { setPreview(result); setMapping(result.mapping); }
    } catch(e) {if(current===rev.current) setError(e instanceof Error ? e.message : "Unable to preview CSV.");}
    finally {if(current===rev.current) setBusy("");}
  }
  function setRole(key:"timestamp"|"label", value:string) {
    if(!mapping) return;
    setMapping({...mapping,[key]:value || null,features:mapping.features.filter(f=>f!==value)});
    if(key==="timestamp" && !value) setLogs(undefined);
  }
  async function start(){
    if(!file || !mapping || busy) return;
    setBusy("Submitting"); setError("");
    try {
      const form = new FormData(); form.append("file",file); form.append("mapping",JSON.stringify(mapping));
      if(localBrief) form.append("local_brief","1");
      if(logs) form.append("logs",logs);
      const result = await api<{id:string}>("/runs",{method:"POST",body:form});
      navigate("/investigations/"+result.id);
    }catch(e){setError(e instanceof Error ? e.message:"Submission failed.");}
    finally {setBusy("");}
  }
  return <><PageTitle title="New investigation" description="Confirm the signals to analyze and the columns used for timing and evaluation."/>
    <label className="brief-choice"><input type="checkbox" checked={localBrief} onChange={e=>setLocalBrief(e.target.checked)}/>
      <span>Request a local-model brief <small>Applies to this CSV or sample run. Ollama reviews the incident with the largest scaled deviation.</small></span></label>
    <div className="upload-grid"><section className="lab-panel"><div className="panel-heading"><h2>Observation data</h2><FileSpreadsheet size={17}/></div>
      <div className="lab-panel-body">
        <label className="file-zone"><UploadCloud size={25}/><strong>{file?.name || "Choose a CSV file"}</strong><small>100–10,000 ordered records · Up to 2 MB</small>
          <input type="file" aria-label="Observation CSV" accept=".csv,text/csv" disabled={busy==="Submitting"} onChange={e=>void choose(e.target.files?.[0])}/></label>
        {preview && mapping && <><div className="section-label"><h3>Column mapping</h3><span>{number(preview.rows)} records</span></div>
          <div className="form-row">{(["timestamp","label"] as const).map(key=><label key={key} className="lab-field">{key==="timestamp" ? "Timestamp" : "Anomaly label"}
            <select value={mapping[key] || ""} onChange={e=>setRole(key,e.target.value)}><option value="">None</option>
              {preview.columns.filter(c=>c!==mapping[key==="timestamp"?"label":"timestamp"]).map(c=><option key={c}>{c}</option>)}</select></label>)}</div>
          <fieldset className="feature-picker"><legend>Numeric signals</legend>{preview.columns.filter(c=>c!==mapping.timestamp && c!==mapping.label).map(c=><label key={c}>
            <input type="checkbox" checked={mapping.features.includes(c)} onChange={e=>setMapping({...mapping,features:e.target.checked ? [...mapping.features,c]:mapping.features.filter(n=>n!==c)})}/>{c}</label>)}</fieldset>
          <div className="section-label"><h3>File preview</h3></div><div className="lab-table-scroll preview-table"><table className="lab-table"><thead><tr>{preview.columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>
            {preview.sample.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table></div>
          {mapping.timestamp && <label className="lab-field log-file">Related event log (optional)<small>CSV with timestamp and message columns. Times are compared in UTC.</small>
            <input type="file" accept=".csv,text/csv" aria-label="Event log CSV" onChange={e=>setLogs(e.target.files?.[0])}/></label>}
        </>}
        <p className="field-hint">Use ISO timestamps in increasing order and binary labels (0 or 1). Each role uses a separate column.</p>
        {error && <Notice error={error}/>}
        <div className="form-submit"><button className="lab-btn primary" disabled={!mapping?.features.length || mapping.features.length>32 || !!busy} onClick={start}>
          {busy ? <LoaderCircle size={15} className="spin"/> : <ArrowRight size={15}/>} {busy || "Start investigation"}</button></div>
      </div></section>
      <section className="lab-panel sample-list"><div className="panel-heading"><h2>Public datasets</h2><Files size={16}/></div>
        {samples.data ? samples.data.datasets.map(s=><div className="sample-item" key={s.id}><strong>{s.name}</strong><small>{number(s.rows)} observations · NAB</small><SampleButton sample={s.id} localBrief={localBrief}/></div>) : <Notice error={samples.error} retry={samples.retry}/>}
      </section></div>
  </>;
}
