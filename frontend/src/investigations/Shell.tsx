import { ReactNode, useEffect, useState } from "react";
import { Activity, ArrowRight, ChartNoAxesCombined, ChevronRight, CircleDot, FlaskConical, History, Layers3, Menu, Microscope, PanelTop, Plus, RadioTower, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useResource } from "./api";
import { PageTitle } from "./ui";

const workspace = [
  ["/","Overview",PanelTop], ["/incidents","Incident inbox",CircleDot], ["/runs","Run history",History],
  ["/analyze","New investigation",Plus]
] as const;
const evaluation = [["/comparison","Benchmarks",ChartNoAxesCombined],["/research","Research tools",FlaskConical]] as const;
export function Shell({children}: {children:ReactNode}){
  const loc=useLocation(), [menu,setMenu]=useState(false);
  const health=useResource<{version:string}>("/status",12000);
  useEffect(()=>{setMenu(false);window.scrollTo(0,0);},[loc.pathname]);
  const path=loc.pathname;
  const section=[...workspace,...evaluation].find(([to])=>to===path)?.[1] ||
    (path.includes("/incidents/") ? "Incident detail" : path.startsWith("/investigations/") ? "Run inspector" : "Research tools");
  function nav(items:readonly (readonly [string,string,typeof Activity])[]) {
    return items.map(([to,title,Icon])=><NavLink key={to} to={to} end={to==="/"} className={({isActive})=>isActive?"nav-active":""}>
      <Icon size={17} strokeWidth={1.7}/>{title}</NavLink>);
  }
  return <div className="lab">
    {menu && <button className="nav-scrim" aria-label="Close navigation" onClick={()=>setMenu(false)}/>}
    <aside className={"lab-sidebar"+(menu?" mobile-open":"")}><Link className="brand-mark" to="/"><span className="brand-symbol"><Activity size={25} strokeWidth={2.3}/></span><span>Ad-Agent</span></Link>
      <button className="mobile-close" aria-label="Close menu" onClick={()=>setMenu(false)}><X size={18}/></button>
      <nav><h2>Workspace</h2>{nav(workspace)}<h2>Research</h2>{nav(evaluation)}</nav>
      <div className="sidebar-foot"><RadioTower size={17}/><div>Local workspace<small>Investigation console</small></div></div>
    </aside>
    <div className="lab-main"><header className="lab-top"><div><button className="mobile-toggle" aria-label="Open menu" aria-expanded={menu} onClick={()=>setMenu(!menu)}><Menu size={19}/></button>
      <Layers3 size={15}/><span>Workspace</span><ChevronRight size={13}/><b>{section}</b></div>
      <span className={"connection "+(health.error?"offline":"")}><i/>{health.error?"Disconnected":health.data?"Connected":"Connecting"}</span></header>
      <main className="lab-content">{children}</main></div></div>;
}
const researchLinks=[["/new","LLM experiment","Run the original code-generating agent workflow in a trusted local session."],
  ["/workbench","Numeric workbench","Compare baseline detectors on ordered CSV observations."],
  ["/experiments","Research history","Review experiments from the original research workspace."],
  ["/knowledge","Knowledge base","Browse the original research notes and model references."],
  ["/feedback","Human feedback","Record a review of a research experiment."]];
export function Research(){
  const q=useResource<{trusted_research:boolean}>("/status");
  return <><PageTitle title="Research tools" description="The original AD-AGENT workflow and standalone numeric workbench."/>
    {q.data && !q.data.trusted_research && <div className="lab-panel lab-panel-body"><h2>Trusted research execution</h2>
    <p>The investigation console runs reviewed, built-in detector plans. For the original generated-Python workflow, start the server in your trusted research environment with <code>AD_AGENT_TRUSTED_RESEARCH=1</code>.</p></div>}
    <section className="lab-panel"><div className="panel-heading"><h2>Research workspace</h2><Microscope size={17}/></div>{researchLinks.map(([url,label,desc])=><Link key={url} className="research-link" to={url}><div><strong>{label}</strong><p>{desc}</p></div><ArrowRight size={17}/></Link>)}</section></>;
}
