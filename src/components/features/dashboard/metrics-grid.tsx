import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface MetricsGridProps {
  monthRealizedValue: number;
  leakedRecoveryValue: number;
  activeMattersCount: number;
  targetProgress: number;
}

export function MetricsGrid({
  monthRealizedValue,
  leakedRecoveryValue,
  activeMattersCount,
  targetProgress,
}: MetricsGridProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {/* MTD Total Billed */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardDescription className="text-muted-foreground">
            MTD Total Billed
          </CardDescription>
          <CardTitle className="text-3xl text-primary">
            {formatCurrency(monthRealizedValue)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Month-to-date realized billable value
          </p>
        </CardContent>
      </Card>

      {/* Leaked Billable Recovery Value */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardDescription className="text-muted-foreground">
            Leaked Recovery Value
          </CardDescription>
          <CardTitle className="text-3xl text-destructive">
            {formatCurrency(leakedRecoveryValue)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Estimated unassigned drafts metric
          </p>
        </CardContent>
      </Card>

      {/* Active Files Count */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardDescription className="text-muted-foreground">
            Active Files
          </CardDescription>
          <CardTitle className="text-3xl text-foreground">
            {activeMattersCount}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Currently open matters
          </p>
        </CardContent>
      </Card>

      {/* Individual Billable Target Performance */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardDescription className="text-muted-foreground">
            Target Performance
          </CardDescription>
          <CardTitle className="text-3xl text-primary">
            {targetProgress.toFixed(1)}%
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Monthly billable target achievement
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
