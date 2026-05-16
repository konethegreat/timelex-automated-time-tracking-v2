"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Executive Dashboard" },
  { href: "/drafts", label: "Validation Pipeline" },
  { href: "/ledger", label: "Time Ledger" },
  { href: "/billing", label: "Pro-Forma Billing" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full bg-canvas">
      <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="border-b border-sidebar-border px-6 py-5">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-primary">
            TimeLex
          </p>
          <h1 className="mt-1.5 text-lg font-semibold text-sidebar-foreground">
            Enterprise
          </h1>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border border-gold/30 bg-primary/10 text-primary"
                    : "text-muted-foreground hover:border hover:border-accent/40 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-6 py-4">
          <p className="text-xs text-muted-foreground">Ghost Practice Bridge</p>
          <p className="mt-0.5 text-xs font-medium text-primary">Connected</p>
        </div>
      </aside>
      <main className="flex flex-1 flex-col bg-background">{children}</main>
    </div>
  );
}
