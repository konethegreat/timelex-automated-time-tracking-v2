import { PageHeader } from "@/components/features/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingPage() {
  return (
    <>
      <PageHeader
        title="Pro-Forma Billing"
        description="Planned: compile matter-filtered entries into pro-forma invoices with 15% VAT. Not built yet."
      />
      <section className="p-8">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base text-primary">
              Planned feature
            </CardTitle>
            <CardDescription>
              PDF export and matter filters — next phase.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </>
  );
}
