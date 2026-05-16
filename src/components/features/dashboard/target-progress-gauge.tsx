import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TargetProgressGaugeProps {
  actualHours: number;
  targetHours: number;
}

export function TargetProgressGauge({
  actualHours,
  targetHours,
}: TargetProgressGaugeProps) {
  const progress = Math.min((actualHours / targetHours) * 100, 100);
  const circumference = 2 * Math.PI * 45; // radius = 45
  const offset = circumference - (progress / 100) * circumference;
  const remainingHours = Math.max(targetHours - actualHours, 0);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardDescription className="text-muted-foreground">
          Monthly Target Progress
        </CardDescription>
        <CardTitle className="text-2xl text-foreground">
          {actualHours.toFixed(1)} / {targetHours} hrs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg
              width="120"
              height="120"
              viewBox="0 0 120 120"
              className="transform -rotate-90"
            >
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted-foreground/20"
              />
              {/* Progress circle */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="text-primary transition-all duration-500 ease-in-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-semibold text-foreground">
                {progress.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {remainingHours > 0
            ? `${remainingHours.toFixed(1)} hrs remaining to target`
            : "Target achieved!"}
        </p>
      </CardContent>
    </Card>
  );
}
