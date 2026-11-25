import { ReactNode } from "react";
import { cn } from "../lib/utils";

export function Button({ children, className, variant = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "ghost" | "outline" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-lime-400/40 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "default" && "bg-zinc-100 text-zinc-950 hover:bg-white",
        variant === "outline" && "border border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:border-zinc-500",
        variant === "ghost" && "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("glass p-5", className)}>{children}</section>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const styles = {
    neutral: "bg-zinc-800 text-zinc-300 border-zinc-700",
    success: "bg-lime-400/10 text-lime-300 border-lime-400/20",
    warning: "bg-amber-400/10 text-amber-300 border-amber-400/20",
    danger: "bg-red-400/10 text-red-300 border-red-400/20"
  };
  return <span className={cn("inline-flex items-center border px-2 py-1 text-[11px] font-medium", styles[tone])}>{children}</span>;
}

export function SectionTitle({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="mb-6">
      {eyebrow && <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.2em] text-lime-300/80">{eyebrow}</div>}
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">{title}</h1>
      {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{description}</p>}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="border border-dashed border-zinc-700 bg-zinc-950/30 p-10 text-center"><div className="text-sm font-medium">{title}</div><p className="mt-2 text-sm text-zinc-500">{description}</p></div>;
}