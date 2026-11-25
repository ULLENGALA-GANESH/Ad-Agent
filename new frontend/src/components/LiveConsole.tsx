import { Terminal } from "lucide-react";
import { Card } from "./ui";

export default function LiveConsole({ logs }: { logs: string[] }) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3"><Terminal size={15} className="text-zinc-500"/><span className="text-xs font-medium">Agent activity</span><span className="ml-auto text-[10px] text-lime-300">LIVE</span></div>
      <div className="console-scroll h-[340px] overflow-y-auto bg-[#08080a] p-4 code-font text-[11px] leading-6 text-zinc-400">
        {logs.map((line, i) => <div key={i} className="whitespace-pre-wrap"><span className="mr-3 text-zinc-700">{String(i + 1).padStart(2, "0")}</span>{line}</div>)}
      </div>
    </Card>
  );
}