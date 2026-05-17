"use client";

import * as React from "react";
import { Mail, Phone, FileText, Users, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { unitsToHours } from "@/lib/utils";

interface Draft {
  id: string;
  activityType: string;
  sourcePlatform: string;
  units: number;
  suggestedText: string;
  timestamp: Date;
  matterId: string | null;
  user: {
    name: string;
    email: string;
  };
}

interface UnassignedQueueProps {
  drafts: Draft[];
  selectedDraftId: string | null;
  onSelectDraft: (draftId: string) => void;
}

function getActivityIcon(activityType: string) {
  switch (activityType) {
    case "EMAIL":
      return <Mail className="h-4 w-4" />;
    case "CALL":
      return <Phone className="h-4 w-4" />;
    case "DOCUMENT":
      return <FileText className="h-4 w-4" />;
    case "MEETING":
      return <Users className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
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

export function UnassignedQueue({
  drafts,
  selectedDraftId,
  onSelectDraft,
}: UnassignedQueueProps) {
  return (
    <Card className="border-border bg-card h-full">
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            Unassigned Queue
          </h3>
          <span className="text-xs text-muted-foreground">
            {drafts.length} pending
          </span>
        </div>
        
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No unassigned drafts
              </p>
            </div>
          ) : (
            drafts.map((draft) => (
              <button
                key={draft.id}
                onClick={() => onSelectDraft(draft.id)}
                className={`w-full rounded-lg border p-3 text-left transition-all ${
                  selectedDraftId === draft.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-border/80 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 text-primary">
                    {getActivityIcon(draft.activityType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-foreground">
                        {draft.activityType}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {draft.sourcePlatform}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {formatTimestamp(draft.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {draft.suggestedText}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary">
                        {unitsToHours(draft.units).toFixed(1)}h
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {draft.user.name}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
