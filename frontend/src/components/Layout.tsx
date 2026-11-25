import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-ink text-zinc-100 app-grid">
      <Sidebar mobileOpen={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}