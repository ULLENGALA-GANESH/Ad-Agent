import { Check, Circle, Loader2, X } from "lucide-react";
import { AgentStage } from "../types";
import { cn, formatDuration } from "../lib/utils";

export default function AgentPipeline({ stages }: { stages: AgentStage[] }) {
  return (
    <div className="grid gap-2 xl:grid-cols-7">
      {stages.map((stage, index) => {
        const active = stage.state === "running";
        return (
          <div key={stage.name} className="relative">
            {index < stages.length - 1 && <div className="absolute left-[calc(100%-2px)] top-5 hidden h-px w-4 bg-zinc-800 xl:block"/>}
            <div className={cn("border p-3 transition", active ? "border-lime-400/40 bg-lime-400/[.04] shadow-glow" : "border-zinc-800 bg-zinc-950/40")}>
              <div className="flex items-center justify-between">
                <div className={cn("grid h-8 w-8 place-items-center border", active ? "border-lime-300/40 text-lime-300" : "border-zinc-800 text-zinc-500")}>
                  {stage.state === "completed" ? <Check size={15}/> : stage.state === "running" ? <Loader2 size={15} className="animate-spin"/> : stage.state === "failed" ? <X size={15}/> : <Circle size={12}/>}
                </div>
                <span className="text-[10px] uppercase tracking-widest text-zinc-600">0{index + 1}</span>
              </div>
              <div className="mt-4 text-xs font-semibold">{stage.name}</div>
              <div className="mt-1 min-h-8 text-[11px] leading-4 text-zinc-500">{stage.message}</div>
              <div className="mt-3 text-[10px] text-zinc-600">{stage.duration ? formatDuration(stage.duration) : active ? "running…" : "queued"}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}