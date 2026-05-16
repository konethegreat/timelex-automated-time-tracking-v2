import { PageHeader } from "@/components/features/page-header";

export default function DraftsPage() {
  return (
    <>
      <PageHeader
        title="Validation Pipeline"
        description="Dual-view draft verification — activity logs and matter assignment."
      />
      <section className="grid flex-1 grid-cols-1 gap-4 p-8 lg:grid-cols-2">
        <article className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-sm font-medium text-gold">Captured activity</h2>
          <p className="mt-2 text-sm text-muted">
            Left panel: integration signals from Outlook, Teams, and local
            capture.
          </p>
        </article>
        <article className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-sm font-medium text-gold">Assignment & narrative</h2>
          <p className="mt-2 text-sm text-muted">
            Right panel: matter autocomplete, narration edits, bulk approve.
          </p>
        </article>
      </section>
    </>
  );
}
