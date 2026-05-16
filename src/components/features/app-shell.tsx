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
    <div className="flex min-h-full">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
        <div className="border-b border-border px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-widest text-gold">
            TimeLex
          </p>
          <h1 className="mt-1 text-lg font-semibold text-foreground">
            Enterprise
          </h1>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                pathname === item.href
                  ? "bg-gold/15 text-gold"
                  : "text-muted hover:bg-surface-elevated hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex flex-1 flex-col bg-background">{children}</main>
    </div>
  );
}
