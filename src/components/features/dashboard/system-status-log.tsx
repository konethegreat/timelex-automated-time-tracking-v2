import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface RecentActivity {
  id: string;
  units: number;
  finalizedText: string;
  syncStatus: string;
  syncLock: boolean;
  createdAt: Date;
  matter: {
    matterNumber: string;
    clientName: string;
  } | null;
  user: {
    name: string;
    email: string;
  };
}

interface SystemStatusLogProps {
  recentActivity: RecentActivity[];
}

function formatUnitsToHours(units: number): string {
  const hours = (units * 6) / 60;
  return `${hours.toFixed(1)}h`;
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getSyncStatusColor(status: string): string {
  switch (status) {
    case "SYNCED":
      return "text-green-500";
    case "PENDING":
      return "text-yellow-500";
    case "ERROR":
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
}

export function SystemStatusLog({ recentActivity }: SystemStatusLogProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardDescription className="text-muted-foreground">
          Real-Time System Status
        </CardDescription>
        <CardTitle className="text-2xl text-foreground">
          Incoming Tracking Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent activity
            </p>
          ) : (
            recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="flex-shrink-0 mt-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      activity.syncLock
                        ? "bg-green-500"
                        : activity.syncStatus === "ERROR"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {activity.user.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • {formatTimestamp(activity.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {activity.finalizedText}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {formatUnitsToHours(activity.units)}
                    </span>
                    {activity.matter && (
                      <span className="text-xs text-muted-foreground">
                        • {activity.matter.matterNumber}
                      </span>
                    )}
                    <span
                      className={`text-xs font-medium ${getSyncStatusColor(
                        activity.syncStatus
                      )}`}
                    >
                      {activity.syncStatus}
                      {activity.syncLock && " (Locked)"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
