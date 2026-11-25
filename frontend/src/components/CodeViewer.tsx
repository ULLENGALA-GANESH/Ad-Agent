import { Copy, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui";

export default function CodeViewer({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  const download = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "adapt_ai_generated.py"; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="border border-zinc-800 bg-[#08080a]">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <span className="code-font text-xs text-zinc-400">adapt_ai_generated.py</span>
        <div className="flex gap-2"><Button variant="ghost" onClick={copy} className="px-2 py-1 text-xs"><Copy size={13}/>{copied ? "Copied" : "Copy"}</Button><Button variant="ghost" onClick={download} className="px-2 py-1 text-xs"><Download size={13}/>Download</Button></div>
      </div>
      <pre className="console-scroll max-h-[430px] overflow-auto p-5 code-font text-[12px] leading-6 text-zinc-300">{code}</pre>
    </div>
  );
}