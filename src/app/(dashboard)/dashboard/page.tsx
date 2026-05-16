import { PageHeader } from "@/components/features/page-header";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Executive Dashboard"
        description="Firm-wide billable performance, leakage metrics, and recent activity."
      />
      <section className="p-8">
        <p className="text-sm text-muted">
          Connects to{" "}
          <span className="font-mono text-gold">GET /api/org/dashboard</span>.
          UI widgets ship in the next phase.
        </p>
      </section>
    </>
  );
}
