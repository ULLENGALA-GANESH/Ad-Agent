import { useId, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dateTime, Detail, number, Point, percent } from "./api";

export default function SignalChart({detail, compact=false}: {detail: Detail; compact?: boolean}) {
  const gradient = useId().replace(/:/g, "");
  const [record, setRecord] = useState(detail.peak_record);
  const points = detail.points.map(p=>({...p, x:p.time ?? p.record, band:[p.low,p.high]}));
  const peak = points.find(p=>p.record===detail.peak_record)!;
  const point = points.find(p=>p.record===record) || peak;
  const isTime = peak.time != null;
  const xLabel = (x:number) => isTime ? new Date(x*1000).toISOString().slice(11,16) : String(x);
  const first = points.find(p=>p.record===detail.first_record)!;
  const last = points.find(p=>p.record===detail.last_record)!;
  function tip({active, payload}: {active?: boolean;payload?: {payload?:Point}[]}) {
    const p = payload?.[0]?.payload;
    return active && p ? <div className="signal-tip"><small>{p.time!=null ? dateTime(p.time,true)+" UTC" : "Record "+p.record}</small><strong>{number(p.value,5)} <span>{detail.metric}</span></strong><small>Rank {percent(p.score)}</small></div> : null;
  }
  return <div className="signal-chart"><div className="plot-height" style={{height:compact ? 188 : 285}}>
    <ResponsiveContainer width="100%" height="100%"><ComposedChart data={points} margin={{top:16,left:0,right:16,bottom:0}}
        onClick={state=>{const p=state?.activePayload?.[0]?.payload; if(p) setRecord(p.record);}}>
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#77d9b3" stopOpacity={0.19}/><stop offset="100%" stopColor="#77d9b3" stopOpacity={0.07}/></linearGradient></defs>
      <CartesianGrid stroke="#273330" strokeDasharray="3 5" vertical={false}/>
      <XAxis dataKey="x" type="number" domain={["dataMin","dataMax"]} tickFormatter={xLabel} minTickGap={28} tickCount={6}
        axisLine={false} tickLine={false} tick={{fill:"#899893",fontSize:10}} tickMargin={9}/>
      <YAxis type="number" domain={["auto","auto"]} tickFormatter={(v:number)=>number(v,3)} width={50}
        axisLine={false} tickLine={false} tick={{fill:"#899893",fontSize:10}} tickCount={5}/>
      <Tooltip content={tip} cursor={{stroke:"#8a9a94",strokeDasharray:"3 5"}} isAnimationActive={false}/>
      <Area dataKey="band" fill={`url(#${gradient})`} stroke="none" isAnimationActive={false}/>
      <ReferenceArea x1={first.x} x2={last.x} stroke="#e9ac65" fill="#e9ac65" fillOpacity={0.10} strokeOpacity={0.4}/>
      <Line dataKey="center" stroke="#7a9288" dot={false} strokeDasharray="4 5" isAnimationActive={false}/>
      <Line dataKey="value" stroke="#83e3bb" strokeWidth={2.1} dot={false} activeDot={{r:4,fill:"#c5f8e1"}} isAnimationActive={false}/>
      <ReferenceDot x={peak.x} y={peak.value} r={5} stroke="#24241e" strokeWidth={2} fill="#ffc681"/>
    </ComposedChart></ResponsiveContainer></div>
    <div className="chart-key"><span><i className="key-trace"/>Observed</span><span><i className="key-band"/>Fitting 5–95% range</span><span><i className="key-alert"/>Largest deviation</span></div>
    {!compact && <div className="point-readout"><label>Inspect record <select value={point.record} onChange={e=>setRecord(Number(e.target.value))}>{points.map(p=><option key={p.record} value={p.record}>{p.record}</option>)}</select></label>
      <span>Observed <b>{number(point.value,5)}</b></span><span>Median <b>{number(point.center,5)}</b></span><span>Score <b>{percent(point.score)}</b></span></div>}
  </div>;
}
