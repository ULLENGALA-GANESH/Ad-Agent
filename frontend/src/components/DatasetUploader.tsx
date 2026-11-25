import { FileUp, X } from "lucide-react";
import { useRef } from "react";
import { Badge } from "./ui";

export default function DatasetUploader({ file, onFile }: { file: File | null; onFile: (file: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input ref={ref} hidden type="file" accept=".csv,.mat,.parquet,.json,.xlsx" onChange={(e) => onFile(e.target.files?.[0] || null)} />
      {!file ? (
        <button type="button" onClick={() => ref.current?.click()} className="group flex w-full flex-col items-center justify-center border border-dashed border-zinc-700 bg-zinc-950/30 px-6 py-14 text-center transition hover:border-zinc-500 hover:bg-zinc-900/30">
          <div className="grid h-11 w-11 place-items-center border border-zinc-700 bg-zinc-900 text-zinc-400 group-hover:text-lime-300"><FileUp size={19}/></div>
          <div className="mt-4 text-sm font-medium">Drop a dataset here or browse</div>
          <div className="mt-2 text-xs text-zinc-500">CSV, MAT, Parquet, JSON, XLSX · up to 250 MB</div>
        </button>
      ) : (
        <div className="border border-zinc-800 bg-zinc-950/50 p-5">
          <div className="flex items-center justify-between">
            <div><div className="text-sm font-medium">{file.name}</div><div className="mt-1 text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</div></div>
            <div className="flex items-center gap-2"><Badge tone="success">Training dataset</Badge><button onClick={() => onFile(null)} className="text-zinc-500 hover:text-zinc-200"><X size={16}/></button></div>
          </div>
        </div>
      )}
    </div>
  );
}