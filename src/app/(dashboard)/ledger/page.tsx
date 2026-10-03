import { PageHeader } from "@/components/features/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LedgerPage() {
  return (
    <>
      <PageHeader
        title="Time Ledger"
        description="Placeholder: approved entries are not listed here yet. Entries lock after the simulated Ghost Practice export."
      />
      <section className="p-8">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base text-primary">Sync lockout</CardTitle>
            <CardDescription>
              Entries with <span className="font-medium text-primary">syncLock</span>{" "}
              are read-only, so that they cannot be exported twice (the export is simulated).
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </>
  );
}
