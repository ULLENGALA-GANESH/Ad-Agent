import { useState } from "react";
import {
  SparklesIcon,
  ClockIcon,
  ArrowRightOnRectangleIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  UserCircleIcon
} from "@heroicons/react/24/outline";

export default function Navbar({
  user,
  onLogout,
  onOpenHistory,
  currentPage,
  setPage,
  hasResults,
  activeRole = "Analyst",
  setActiveRole
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const roles = [
    { name: "Analyst", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30", desc: "Triage alerts & verify anomalies" },
    { name: "Manager", color: "text-violet-400 bg-violet-500/10 border-violet-500/30", desc: "Audit decisions & compliance review" },
    { name: "Admin", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", desc: "Manage presets, wipes & API keys" }
  ];

  const currentCompany = (!user?.company || user?.company === "PERSONAL_GURU") ? "Fortis Dynamics" : user.company;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-black/60 border-b border-white/10 px-6 py-3 flex items-center justify-between">
      {/* Brand & Workspace */}
      <div className="flex items-center gap-5">
        <button
          onClick={() => setPage("home")}
          className="flex items-center gap-2.5 text-left group"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tracking-tight text-white">AD-AGENT</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wide">
                Enterprise
              </span>
            </div>
            <p className="text-[11px] text-gray-400">Autonomous Anomaly Intelligence</p>
          </div>
        </button>

        {/* Workspace Tag */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <BuildingOffice2Icon className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-semibold text-white">{currentCompany}</span>
          <span className="text-gray-500">&bull;</span>
          <span className="text-gray-400">Production</span>
        </div>

        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold transition-all"
            title="Switch Simulated Role"
          >
            <UserCircleIcon className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-400">Role:</span>
            <span className={roles.find(r => r.name === activeRole)?.color.split(" ")[0] || "text-cyan-400"}>
              {activeRole}
            </span>
            <ChevronDownIcon className="w-3 h-3 text-gray-400 ml-0.5" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute left-0 mt-2 w-56 backdrop-blur-3xl bg-gray-900/95 border border-white/15 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-white/10 mb-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Select Enterprise Role</p>
              </div>
              {roles.map((r) => (
                <button
                  key={r.name}
                  onClick={() => {
                    if (setActiveRole) setActiveRole(r.name);
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full flex flex-col text-left px-3 py-2 rounded-xl text-xs transition-all ${
                    activeRole === r.name ? "bg-white/10 font-bold text-white" : "hover:bg-white/5 text-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={r.color.split(" ")[0]}>{r.name}</span>
                    {activeRole === r.name && <CheckCircleIcon className="w-3.5 h-3.5 text-green-400" />}
                  </div>
                  <span className="text-[10px] text-gray-400 font-normal mt-0.5">{r.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex items-center gap-1.5 md:gap-2.5">
        <button
          onClick={() => setPage("home")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            currentPage === "home"
              ? "bg-white/10 text-white border border-white/15"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Studio
        </button>

        {hasResults && (
          <button
            onClick={() => setPage("results")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentPage === "results"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <ChartBarIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Results Hub</span>
          </button>
        )}

        <button
          onClick={() => setPage("integrations")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            currentPage === "integrations"
              ? "bg-white/10 text-white border border-white/15"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <CpuChipIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Integrations</span>
        </button>

        <button
          onClick={() => setPage("audit")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            currentPage === "audit"
              ? "bg-white/10 text-white border border-white/15"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <ClipboardDocumentListIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Audit Log</span>
        </button>

        <button
          onClick={() => setPage("privacy")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            currentPage === "privacy"
              ? "bg-white/10 text-white border border-white/15"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Trust & Privacy</span>
        </button>

        <div className="h-4 w-px bg-white/15 mx-1 hidden sm:block" />

        <button
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
          title="Job Execution History"
        >
          <ClockIcon className="w-4 h-4 text-cyan-400" />
          <span className="hidden md:inline">History</span>
        </button>

        {/* User Profile Dropdown */}
        <div className="relative ml-1">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="text-left hidden xl:block">
              <p className="text-xs font-bold text-white leading-none">{user?.name || "Alex Vance"}</p>
              <p className="text-[10px] text-cyan-400 leading-tight mt-0.5">{user?.tier || "Enterprise Tier"}</p>
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 backdrop-blur-3xl bg-gray-900/95 border border-white/15 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2.5 border-b border-white/10 mb-1">
                <p className="text-xs font-bold text-white">{user?.name || "Alex Vance"}</p>
                <p className="text-[11px] text-gray-400 truncate">{user?.email || "demo@adagent.ai"}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  <span>Licensed Enterprise Account</span>
                </div>
              </div>

              <button
                onClick={() => { setDropdownOpen(false); setPage("integrations"); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-300 hover:bg-white/10 transition-all text-left"
              >
                <CpuChipIcon className="w-4 h-4 text-cyan-400" />
                <span>API Keys & Webhooks</span>
              </button>

              <button
                onClick={() => { setDropdownOpen(false); setPage("privacy"); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-300 hover:bg-white/10 transition-all text-left"
              >
                <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
                <span>Data Isolation & Retention</span>
              </button>

              <button
                onClick={() => { setDropdownOpen(false); onOpenHistory(); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-300 hover:bg-white/10 transition-all text-left"
              >
                <ClockIcon className="w-4 h-4 text-cyan-400" />
                <span>Execution Logs & History</span>
              </button>

              <div className="my-1 border-t border-white/10" />

              <button
                onClick={() => { setDropdownOpen(false); onLogout(); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-all text-left font-semibold"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
