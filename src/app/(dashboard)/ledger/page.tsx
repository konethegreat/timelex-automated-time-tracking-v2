import { PageHeader } from "@/components/features/page-header";

export default function LedgerPage() {
  return (
    <>
      <PageHeader
        title="Time Ledger"
        description="Approved entries with sync gate — locked after Ghost Practice push."
      />
      <section className="p-8">
        <p className="text-sm text-muted">
          Entries with <span className="text-gold">syncLock</span> are read-only
          to prevent double-billing.
        </p>
      </section>
    </>
  );
}
