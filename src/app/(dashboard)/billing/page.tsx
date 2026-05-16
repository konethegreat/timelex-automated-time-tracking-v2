import { PageHeader } from "@/components/features/page-header";

export default function BillingPage() {
  return (
    <>
      <PageHeader
        title="Pro-Forma Billing"
        description="Compile matter-filtered entries into client-facing invoices with 15% VAT."
      />
      <section className="p-8">
        <p className="text-sm text-muted">
          Universal billing engine — PDF export in the next phase.
        </p>
      </section>
    </>
  );
}
