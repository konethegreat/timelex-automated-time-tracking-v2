import { PageHeader } from "@/components/features/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Executive Dashboard"
        description="Firm-wide billable performance, leakage metrics, and recent activity."
      />
      <section className="grid gap-4 p-8 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardDescription className="text-muted-foreground">
              Today billable
            </CardDescription>
            <CardTitle className="text-3xl text-primary">—</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Wired to{" "}
              <span className="font-mono text-xs text-primary">
                GET /api/org/dashboard
              </span>
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader>
            <CardDescription className="text-muted-foreground">
              Month-to-date
            </CardDescription>
            <CardTitle className="text-3xl text-foreground">—</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Target progress ring — next phase
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader>
            <CardDescription className="text-muted-foreground">
              Pending drafts
            </CardDescription>
            <CardTitle className="text-3xl text-foreground">—</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Validation pipeline queue
            </p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
