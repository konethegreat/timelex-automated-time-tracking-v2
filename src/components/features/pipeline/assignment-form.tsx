"use client";

import * as React from "react";
import { Plus, Minus, Check, CheckCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MatterSelector } from "@/components/ui/command";
import { toast } from "sonner";
import { unitsToHours } from "@/lib/utils";

interface Matter {
  id: string;
  matterNumber: string;
  clientName: string;
  description: string;
}

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

interface AssignmentFormProps {
  selectedDraft: Draft | null;
  matters: Matter[];
  onApprove: (draftId: string, matterId: string, units: number, narrative: string) => Promise<void>;
  onApproveAll: () => Promise<void>;
  onMatterSearch: (query: string) => void;
  onDraftUpdated: () => void;
}

export function AssignmentForm({
  selectedDraft,
  matters,
  onApprove,
  onApproveAll,
  onMatterSearch,
  onDraftUpdated,
}: AssignmentFormProps) {
  const [selectedMatterId, setSelectedMatterId] = React.useState<string | null>(null);
  const [units, setUnits] = React.useState(selectedDraft?.units ?? 1);
  const [narrative, setNarrative] = React.useState(selectedDraft?.suggestedText ?? "");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isApprovingAll, setIsApprovingAll] = React.useState(false);

  const handleUnitChange = (delta: number) => {
    const newUnits = Math.max(1, units + delta);
    setUnits(newUnits);
  };

  const handleApprove = async () => {
    if (!selectedDraft || !selectedMatterId) {
      toast.error("Please select a matter before approving");
      return;
    }

    setIsSubmitting(true);
    try {
      await onApprove(selectedDraft.id, selectedMatterId, units, narrative);
      toast.success("Draft approved successfully");
      setSelectedMatterId(null);
      onDraftUpdated();
    } catch (error) {
      toast.error("Failed to approve draft");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveAll = async () => {
    setIsApprovingAll(true);
    try {
      await onApproveAll();
      toast.success("All drafts approved successfully");
      onDraftUpdated();
    } catch (error) {
      toast.error("Failed to approve all drafts");
      console.error(error);
    } finally {
      setIsApprovingAll(false);
    }
  };

  if (!selectedDraft) {
    return (
      <Card className="border-border bg-card h-full">
        <CardHeader>
          <CardTitle className="text-base text-primary">
            Assignment & Narrative
          </CardTitle>
          <CardDescription>
            Select a draft from the queue to assign and approve
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Check className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No draft selected
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card h-full">
      <CardHeader>
        <CardTitle className="text-base text-primary">
          Assignment & Narrative
        </CardTitle>
        <CardDescription>
          Matter autocomplete, narration edits, and approval
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Matter Allocation Selector */}
        <div className="space-y-2">
          <Label htmlFor="matter">Matter Allocation</Label>
          <MatterSelector
            matters={matters}
            selectedMatterId={selectedMatterId}
            onSelect={setSelectedMatterId}
            onSearch={onMatterSearch}
          />
        </div>

        {/* Duration Adjuster */}
        <div className="space-y-2">
          <Label htmlFor="units">Duration (6-minute units)</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleUnitChange(-1)}
              disabled={units <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id="units"
              type="number"
              value={units}
              onChange={(e) => setUnits(Math.max(1, parseInt(e.target.value) || 1))}
              className="text-center"
              min={1}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleUnitChange(1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground ml-2">
              ({unitsToHours(units).toFixed(1)}h)
            </span>
          </div>
        </div>

        {/* Smart Narrative Text Area */}
        <div className="space-y-2">
          <Label htmlFor="narrative">Narrative</Label>
          <textarea
            id="narrative"
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
            placeholder="Enter narrative description..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleApprove}
            disabled={!selectedMatterId || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              "Approving..."
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Approve
              </>
            )}
          </Button>
          <Button
            onClick={handleApproveAll}
            variant="outline"
            disabled={isApprovingAll}
          >
            {isApprovingAll ? (
              "Approving All..."
            ) : (
              <>
                <CheckCheck className="mr-2 h-4 w-4" />
                Approve All
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
