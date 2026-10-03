"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/features/page-header";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatHours } from "@/lib/utils";

interface Entry {
  id: string;
  units: number;
  finalizedText: string;
  hourlyRateApplied: string;
  totalValue: string;
  syncStatus: "PENDING" | "SYNCED" | "ERROR";
  syncLock: boolean;
  matter: { matterNumber: string; clientName: string };
  user: { name: string; email: string };
}

async function readEntries(): Promise<{ entries: Entry[]; hasMore: boolean }> {
  const response = await fetch("/api/entries");
  if (!response.ok) throw new Error("Could not load time entries. Try refreshing.");
  return response.json();
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadEntries() {
    const data = await readEntries();
    setEntries(data.entries);
    setHasMore(data.hasMore);
    setSelected([]);
  }

  useEffect(() => {
    let active = true;
    readEntries().then(data => {
      if (active) { setEntries(data.entries); setHasMore(data.hasMore); }
    }).catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try { await loadEntries(); }
    catch (err) { setError(err instanceof Error ? err.message : "Refresh failed"); }
    finally { setLoading(false); }
  }

  async function synchronize() {
    setSyncing(true);
    try {
      const response = await fetch("/api/sync/gateway", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryIds: selected }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Simulated synchronization failed");
      toast.success("Simulated synchronization completed", {
        description: "Selected entries are locked locally. No external records were sent.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Simulated synchronization failed");
    } finally {
      try { await loadEntries(); }
      catch (err) { setError(err instanceof Error ? err.message : "Refresh failed"); }
      setSyncing(false);
    }
  }

  return (
    <>
      <PageHeader title="Time Ledger" description="Approved time entries and simulated Ghost Practice synchronization." />
      <section className="space-y-4 p-8">
        <p className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
          The gateway changes local status only. No records are sent to Ghost Practice.
          Synced entries are locked; ERROR entries cannot be retried through this prototype.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={synchronize} disabled={selected.length === 0 || syncing || loading}>
            {syncing ? "Simulating…" : "Simulate sync selected"}
          </Button>
          <Button variant="outline" onClick={refresh} disabled={loading || syncing}>Refresh</Button>
          <span className="text-sm text-muted-foreground">{selected.length} selected</span>
        </div>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {loading ? <p>Loading time entries…</p> : entries.length === 0 ? (
          <p className="text-muted-foreground">No approved entries yet. Review a draft in the Validation Pipeline.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50"><tr>
                {["Select", "Matter / fee earner", "Reviewed narrative", "Duration", "Rate / value", "Sync status"].map(label => <th key={label} className="p-3">{label}</th>)}
              </tr></thead>
              <tbody>{entries.map(entry => (
                <tr key={entry.id} className="border-t border-border align-top">
                  <td className="p-3"><input type="checkbox"
                    aria-label={"Select entry: " + entry.finalizedText}
                    disabled={entry.syncLock || entry.syncStatus !== "PENDING" || syncing}
                    checked={selected.includes(entry.id)}
                    onChange={event => setSelected(current => event.target.checked ? [...current, entry.id] : current.filter(id => id !== entry.id))} /></td>
                  <td className="p-3"><p className="font-medium">{entry.matter.matterNumber}</p><p>{entry.matter.clientName}</p><p className="text-muted-foreground">{entry.user.name}</p></td>
                  <td className="max-w-sm p-3">{entry.finalizedText}</td>
                  <td className="whitespace-nowrap p-3">{entry.units} units · {formatHours(entry.units)}h</td>
                  <td className="whitespace-nowrap p-3"><p>{formatCurrency(entry.hourlyRateApplied)}/h</p><p className="font-medium">{formatCurrency(entry.totalValue)}</p></td>
                  <td className="p-3"><span className={entry.syncStatus === "ERROR" ? "text-destructive" : entry.syncLock ? "text-green-500" : "text-primary"}>{entry.syncStatus}{entry.syncLock ? " · Locked" : ""}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {hasMore && <p role="status" className="text-sm text-muted-foreground">Showing the latest 100 entries. Older entries are not included in this view.</p>}
      </section>
    </>
  );
}
