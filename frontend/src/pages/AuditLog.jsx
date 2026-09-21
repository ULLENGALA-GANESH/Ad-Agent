import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ClipboardDocumentListIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  UserCircleIcon
} from "@heroicons/react/24/outline";
import { fetchAuditLogs } from "../api/backend";

export default function AuditLog({ onBackToStudio }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("ALL");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesAction = filterAction === "ALL" || log.action === filterAction;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      (log.user_email && log.user_email.toLowerCase().includes(q)) ||
      (log.target && log.target.toLowerCase().includes(q)) ||
      (log.details && log.details.toLowerCase().includes(q)) ||
      (log.action && log.action.toLowerCase().includes(q));
    return matchesAction && matchesSearch;
  });

  const exportCSV = () => {
    const headers = ["ID", "Timestamp", "User", "Action", "Target", "Details"];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.created_at,
      l.user_email,
      l.action,
      `"${(l.target || "").replace(/"/g, '""')}"`,
      `"${(l.details || "").replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action) => {
    switch (action) {
      case "INCIDENT_TRIAGE":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      case "WORKSPACE_WIPE":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "USER_REGISTER":
      case "USER_LOGIN":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      default:
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#070913] to-black text-white p-6 pt-24 pb-16">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
              <ClipboardDocumentListIcon className="w-4 h-4 text-cyan-400" />
              <span>SOC-2 / ISO-27001 Compliance Trail</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">Immutable Audit Log</h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Cryptographically timestamped ledger of pipeline triggers, analyst triage decisions, and administrative purges.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportCSV}
              disabled={filteredLogs.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer disabled:opacity-40"
            >
              <ArrowDownTrayIcon className="w-4 h-4 text-cyan-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={loadLogs}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 transition-all cursor-pointer disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            {onBackToStudio && (
              <button
                onClick={onBackToStudio}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer shrink-0"
              >
                &larr; Back
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-2xl p-3">
          <div className="relative w-full sm:w-80">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user, action, target or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs text-gray-400 font-semibold flex items-center gap-1">
              <FunnelIcon className="w-3.5 h-3.5" /> Filter:
            </span>
            {["ALL", "INCIDENT_TRIAGE", "WORKSPACE_WIPE", "USER_LOGIN"].map((act) => (
              <button
                key={act}
                onClick={() => setFilterAction(act)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  filterAction === act
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {act === "ALL" ? "All Events" : act.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Table */}
        <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-white/5 text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Event Action</th>
                  <th className="py-3 px-4">Target Resource</th>
                  <th className="py-3 px-4">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 font-sans">
                      <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading verified audit entries...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 font-sans">
                      No audit records matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                        {log.created_at ? log.created_at.replace("T", " ").slice(0, 19) : "Just now"}
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <UserCircleIcon className="w-3.5 h-3.5 text-gray-400" />
                          <span>{log.user_email || "system@adagent.ai"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getActionBadge(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-cyan-300 max-w-[200px] truncate" title={log.target}>
                        {log.target || "system"}
                      </td>
                      <td className="py-3 px-4 font-sans text-gray-300 max-w-[340px] truncate" title={log.details}>
                        {log.details || "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
