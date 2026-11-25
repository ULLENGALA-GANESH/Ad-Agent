import { Menu, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "./ui";
import { getHealth } from "../api/client";

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    let active = true;
    const check = () => {
      getHealth()
        .then(() => {
          if (active) setBackendOnline(true);
        })
        .catch(() => {
          if (active) setBackendOnline(false);
        });
    };
    check();
    const interval = setInterval(check, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-800/70 bg-[#09090b]/85 px-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="text-zinc-400 lg:hidden"><Menu size={20}/></button>
        <div className="text-xs text-zinc-500">Workspace / <span className="text-zinc-300">Adaptive Anomaly Research</span></div>
      </div>
      <div className="flex items-center gap-3">
        <Badge tone={backendOnline ? "success" : "danger"}>
          <span className={backendOnline ? "mr-1.5 h-1.5 w-1.5 rounded-full bg-lime-300 animate-pulse" : "mr-1.5 h-1.5 w-1.5 rounded-full bg-red-400"}/>
          {backendOnline ? "Backend connected" : "Backend offline"}
        </Badge>
        <button className="hidden p-2 text-zinc-500 hover:text-zinc-200 sm:block"><Moon size={16}/></button>
        <div className="hidden h-8 w-8 place-items-center bg-zinc-800 text-xs font-semibold md:grid">R</div>
      </div>
    </header>
  );
}