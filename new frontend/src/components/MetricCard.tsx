import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "./ui";

export default function MetricCard({ label, value, delta, good = true }: { label: string; value: string; delta?: string; good?: boolean }) {
  return (
    <Card className="min-h-32">
      <div className="text-xs uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="mt-4 flex items-end justify-between">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {delta && <div className={good ? "text-xs text-lime-300" : "text-xs text-amber-300"}>{good ? <ArrowUpRight size={13} className="inline"/> : <ArrowDownRight size={13} className="inline" />} {delta}</div>}
      </div>
    </Card>
  );
}