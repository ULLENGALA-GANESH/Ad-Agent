import { useState, useRef, useEffect } from "react";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Console from "./pages/Console";
import Results from "./pages/Results";
import Privacy from "./pages/Privacy";
import Integrations from "./pages/Integrations";
import AuditLog from "./pages/AuditLog";
import Navbar from "./components/Navbar";
import HistoryModal from "./components/HistoryModal";
import { logout, fetchResults } from "./api/backend";

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("ad_agent_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [activeRole, setActiveRole] = useState("Analyst");
  const [page, setPage] = useState("home");
  const [jobId, setJobId] = useState(null);
  const [results, setResults] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const trainPath = useRef(null);
  const testPath = useRef(null);

  const handleLogout = () => {
    logout();
    setUser(null);
    setPage("home");
  };

  const handleSelectJob = async (selectedJobId) => {
    setJobId(selectedJobId);
    try {
      const data = await fetchResults(selectedJobId);
      setResults(data);
    } catch (err) {
      console.warn("Direct fetch had issue, will load in Results component:", err);
      setResults(null);
    }
    setPage("results");
  };

  const handleSelectConsole = (runningJobId) => {
    setJobId(runningJobId);
    setPage("console");
  };

  // If user not authenticated, render high-conversion enterprise login/signup
  if (!user) {
    return <Auth onAuthSuccess={(usr) => setUser(usr)} />;
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenHistory={() => setHistoryOpen(true)}
        currentPage={page}
        setPage={setPage}
        hasResults={Boolean(results || jobId)}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
      />

      <HistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectJob={handleSelectJob}
        onSelectConsole={handleSelectConsole}
      />

      <main>
        {page === "home" && (
          <Home
            setJobId={(id) => {
              setJobId(id);
              setPage("console");
            }}
            trainPath={trainPath}
            testPath={testPath}
          />
        )}

        {page === "console" && (
          <Console
            jobId={jobId}
            setResults={setResults}
            setPage={setPage}
          />
        )}

        {page === "results" && (
          <Results
            jobId={jobId}
            results={results}
            onBackToStudio={() => setPage("home")}
            activeRole={activeRole}
          />
        )}

        {page === "privacy" && (
          <Privacy onBackToStudio={() => setPage("home")} />
        )}

        {page === "integrations" && (
          <Integrations onBackToStudio={() => setPage("home")} />
        )}

        {page === "audit" && (
          <AuditLog onBackToStudio={() => setPage("home")} />
        )}
      </main>
    </div>
  );
}

