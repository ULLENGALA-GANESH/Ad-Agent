import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Shell, Research } from "./investigations/Shell";
import { Overview, IncidentInbox, History } from "./investigations/Overview";
import Upload from "./investigations/Upload";
import Inspector from "./investigations/Inspector";
import Comparison from "./investigations/Comparison";
import "./investigations/lab.css";
const Incident = lazy(() => import("./investigations/Incident"));
const Workbench = lazy(() => import("./pages/Workbench"));
const NewExperiment = lazy(() => import("./pages/NewExperiment"));
const LiveExperiment = lazy(() => import("./pages/LiveExperiment"));
const Results = lazy(() => import("./pages/Results"));
const Knowledge = lazy(() => import("./pages/Knowledge"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Experiments = lazy(() => import("./pages/Experiments"));
const Settings = lazy(() => import("./pages/Settings"));

export default function App() {
  return (
    <Shell><Suspense fallback={<p role="status" className="lab-loading">Loading workspace…</p>}>
      <Routes>
        <Route path="/" element={<Overview/>}/>
        <Route path="/incidents" element={<IncidentInbox/>}/>
        <Route path="/runs" element={<History/>}/>
        <Route path="/analyze" element={<Upload/>}/>
        <Route path="/investigations/:runId" element={<Inspector/>}/>
        <Route path="/investigations/:runId/incidents/:number" element={<Incident/>}/>
        <Route path="/comparison" element={<Comparison/>}/>
        <Route path="/research" element={<Research/>}/>
        <Route path="/dashboard" element={<Navigate to="/" replace/>}/>
        <Route path="/workbench" element={<Workbench/>}/>
        <Route path="/new" element={<NewExperiment/>}/>
        <Route path="/live" element={<LiveExperiment/>}/>
        <Route path="/results" element={<Results/>}/>
        <Route path="/models" element={<Navigate to="/comparison" replace/>}/>
        <Route path="/knowledge" element={<Knowledge/>}/>
        <Route path="/feedback" element={<Feedback/>}/>
        <Route path="/benchmarks" element={<Navigate to="/comparison" replace/>}/>
        <Route path="/experiments" element={<Experiments/>}/>
        <Route path="/settings" element={<Settings/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </Suspense></Shell>
  );
}
