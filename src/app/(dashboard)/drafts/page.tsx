import { PageHeader } from "@/components/features/page-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DraftsPage() {
  return (
    <>
      <PageHeader
        title="Validation Pipeline"
        description="Dual-view draft verification — activity logs and matter assignment."
      />
      <section className="grid flex-1 grid-cols-1 gap-4 p-8 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base text-primary">
              Captured activity
            </CardTitle>
            <CardDescription>
              Integration signals from Outlook, Teams, and local capture.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base text-primary">
              Assignment & narrative
            </CardTitle>
            <CardDescription>
              Matter autocomplete, narration edits, and bulk approve.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </>
  );
}
