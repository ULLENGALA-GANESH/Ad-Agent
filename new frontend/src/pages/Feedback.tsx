import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getExperiments, submitFeedback } from "../api/client";
import { Notice, PageTitle } from "../investigations/ui";
import type { Experiment } from "../types";

export default function Feedback() {
  const [jobs, setJobs] = useState<Experiment[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);
  const [jobId, setJobId] = useState("");
  const [action, setAction] = useState("Approve");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoadError("");
    getExperiments().then(items => {
      if (!active) return;
      const completed = items.filter(job => job.status === "Completed" && job.model && job.model !== "Awaiting selection");
      setJobs(completed);
      setJobId(completed[0]?.id || "");
    }).catch(e => { if (active) setLoadError(e.message || "Unable to read experiments."); });
    return () => { active = false; };
  }, [revision]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!jobId || saving) return;
    setSaving(true);
    setError("");
    try {
      await submitFeedback({job_id: jobId, action, feedback: note});
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save this review.");
    } finally {
      setSaving(false);
    }
  }

  return <><PageTitle title="Research feedback" description="Record a review of a completed research experiment."/>
    {loadError || jobs === null ? <Notice error={loadError} retry={() => setRevision(n => n + 1)}/> :
      jobs.length === 0 ? <div className="lab-panel lab-panel-body"><h2>No completed research experiments</h2>
        <p>Completed research runs appear here for review.</p><Link className="text-link" to="/experiments">View research history</Link></div> :
      <section className="lab-panel lab-panel-body"><h2>Review a model decision</h2>
        {saved ? <div role="status"><p>Your review has been saved with this experiment.</p>
          <button className="text-link" onClick={() => { setNote(""); setSaved(false); }}>Write another review</button></div> :
          <form className="space-y-4 mt-4" onSubmit={submit}>
            <fieldset disabled={saving} className="space-y-4">
              <div><label htmlFor="review-experiment">Experiment</label>
                <select id="review-experiment" className="block w-full mt-2 p-2 bg-zinc-900" value={jobId} onChange={e => setJobId(e.target.value)}>
                  {jobs.map(job => <option value={job.id} key={job.id}>{job.dataset} · {job.model} · {job.id.slice(0,8)}</option>)}</select></div>
              <div><label htmlFor="review-decision">Decision</label>
                <select id="review-decision" className="block w-full mt-2 p-2 bg-zinc-900" value={action} onChange={e => setAction(e.target.value)}>
                  <option>Approve</option><option>Request changes</option><option>Reject</option></select></div>
              <label className="block">Review note<textarea className="block w-full mt-2 p-2 bg-zinc-900" rows={4} value={note} onChange={e => setNote(e.target.value)}/></label>
              {error && <p className="lab-error" role="alert">{error}</p>}
              <button className="lab-btn" type="submit">{saving ? "Saving…" : "Save review"}</button>
            </fieldset>
          </form>}
      </section>}
  </>;
}
