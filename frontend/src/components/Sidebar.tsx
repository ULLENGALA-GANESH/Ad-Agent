import { NavLink } from "react-router-dom";
import { BarChart3, Beaker, BrainCircuit, Database, FlaskConical, History, LayoutDashboard, MessageSquareText, Settings, Workflow, X } from "lucide-react";
import { cn } from "../lib/utils";

const items = [
  ["/", "Dashboard", LayoutDashboard],
  ["/workbench", "Anomaly Workbench", Workflow],
  ["/new", "New Experiment", Beaker],
  ["/experiments", "Experiments", History],
  ["/models", "Models", BrainCircuit],
  ["/knowledge", "Knowledge Base", Database],
  ["/benchmarks", "Benchmarks", BarChart3],
  ["/feedback", "Human Feedback", MessageSquareText],
  ["/settings", "Settings", Settings]
] as const;

export default function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-800/80 bg-[#0b0b0e] transition-transform lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-20 items-center justify-between border-b border-zinc-800/70 px-5">
          <div>
            <div className="text-sm font-bold tracking-[.18em] text-zinc-100">ADAPT-AI</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-zinc-500">Research Console</div>
          </div>
          <button onClick={onClose} className="text-zinc-500 lg:hidden"><X size={18}/></button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => cn(
              "group flex items-center gap-3 px-3 py-2.5 text-sm transition",
              isActive ? "bg-zinc-800/80 text-zinc-100" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
            )}>
              <Icon size={17} strokeWidth={1.7}/>
              <span>{label}</span>
              {label === "New Experiment" && <span className="ml-auto text-[10px] text-lime-300">⌘N</span>}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-zinc-800/70 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center bg-zinc-800 text-xs font-semibold">MA</div>
            <div><div className="text-xs font-medium">Research User</div><div className="text-[10px] text-zinc-500">Local workspace</div></div>
          </div>
        </div>
      </aside>
    </>
  );
}