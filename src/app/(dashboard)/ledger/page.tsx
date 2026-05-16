import { PageHeader } from "@/components/features/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LedgerPage() {
  return (
    <>
      <PageHeader
        title="Time Ledger"
        description="Approved entries with sync gate — locked after Ghost Practice push."
      />
      <section className="p-8">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base text-primary">Sync lockout</CardTitle>
            <CardDescription>
              Entries with <span className="font-medium text-primary">syncLock</span>{" "}
              are read-only to prevent double-billing in Ghost Practice.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </>
  );
}
