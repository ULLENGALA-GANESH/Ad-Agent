import { API_BASE_URL } from "../api/client";
import { useResource } from "../investigations/api";
import { Notice, PageTitle } from "../investigations/ui";

export default function Settings() {
  const status = useResource<{version: string; trusted_research: boolean; brief_model: string}>("/status");
  return <><PageTitle title="Workspace settings" description="Configuration reported by the running local service."/>
    {status.data ? <section className="lab-panel lab-panel-body"><h2>Current configuration</h2>
      <dl className="mt-3 space-y-3">{[
        ["Research API", API_BASE_URL || window.location.origin],
        ["Investigation engine", status.data.version],
        ["Trusted research execution", status.data.trusted_research ? "Enabled" : "Disabled"],
        ["Configured Ollama model", status.data.brief_model]
      ].map(([label, value]) => <div key={label}><dt className="text-zinc-400">{label}</dt><dd>{value}</dd></div>)}</dl>
    </section> : <Notice error={status.error} retry={status.retry}/>}
  </>;
}
