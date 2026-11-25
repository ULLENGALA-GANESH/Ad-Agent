import { useState } from "react";
import { Link } from "react-router-dom";
import { Benchmark, detectors, number, useResource } from "../investigations/api";
import { Notice, PageTitle } from "../investigations/ui";

export default function Knowledge() {
  const report = useResource<Benchmark>("/benchmark");
  const [query, setQuery] = useState("");
  const matches = report.data?.datasets.filter(item =>
    [item.name, detectors[item.selected], item.reason].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  return <><PageTitle title="Research evidence" description="Search the datasets and detector decisions in the recorded benchmark."/>
    <section className="lab-panel lab-panel-body"><label className="block">Search evidence
      <input type="search" className="block w-full mt-2 p-2 bg-zinc-900" value={query} onChange={e => setQuery(e.target.value)} placeholder="Dataset or detector"/></label>
      {matches ? matches.length ? matches.map(item => <article key={item.id} className="py-5 border-b border-zinc-800">
        <h2>{item.name}</h2><p>{detectors[item.selected]} · {number(item.evaluated)} held-out observations</p>
        <p>{item.reason}</p><a className="text-link" href={item.url} target="_blank" rel="noreferrer">Original NAB trace</a>
      </article>) : <p>No records match this search.</p> : <Notice error={report.error} retry={report.retry}/>}
      <Link className="text-link mt-4" to="/comparison">Compare detector results</Link>
    </section></>;
}
