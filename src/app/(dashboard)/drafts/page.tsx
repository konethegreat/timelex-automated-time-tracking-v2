"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/features/page-header";
import { UnassignedQueue } from "@/components/features/pipeline/unassigned-queue";
import { AssignmentForm } from "@/components/features/pipeline/assignment-form";
import { toast } from "sonner";

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

interface Matter {
  id: string;
  matterNumber: string;
  clientName: string;
  description: string;
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedDraft = drafts.find((d) => d.id === selectedDraftId);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [draftsResponse, mattersResponse] = await Promise.all([
          fetch("/api/drafts"),
          fetch("/api/matters/search"),
        ]);

        if (!draftsResponse.ok || !mattersResponse.ok) {
          throw new Error("Failed to fetch data");
        }

        const draftsData = await draftsResponse.json();
        const mattersData = await mattersResponse.json();

        setDrafts(draftsData.drafts || []);
        setMatters(mattersData.matters || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        toast.error("Failed to load pipeline data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleApprove = async (
    draftId: string,
    matterId: string,
    units: number,
    narrative: string
  ) => {
    // First update the draft with matter, narrative and the duration set in the form
    const updateResponse = await fetch("/api/drafts/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftIds: [draftId],
        matterId,
        suggestedText: narrative,
        units,
      }),
    });

    if (!updateResponse.ok) {
      throw new Error("Failed to update draft");
    }

    // Then approve the draft
    const approveResponse = await fetch("/api/entries/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftIds: [draftId] }),
    });

    if (!approveResponse.ok) {
      throw new Error("Failed to approve draft");
    }
  };

  const handleApproveAll = async () => {
    const unassignedDrafts = drafts.filter((d) => !d.matterId);
    if (unassignedDrafts.length === 0) {
      toast.error("No unassigned drafts to approve");
      return;
    }

    throw new Error("Approve all requires matter assignment first");
  };

  const handleMatterSearch = async (query: string) => {
    try {
      const response = await fetch(`/api/matters/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setMatters(data.matters || []);
      }
    } catch (err) {
      console.error("Failed to search matters:", err);
    }
  };

  const handleDraftUpdated = () => {
    // Refresh drafts after approval
    fetch("/api/drafts")
      .then((res) => res.json())
      .then((data) => {
        setDrafts(data.drafts || []);
        setSelectedDraftId(null);
      })
      .catch((err) => {
        console.error("Failed to refresh drafts:", err);
        toast.error("Failed to refresh drafts");
      });
  };

  if (loading) {
    return (
      <>
        <PageHeader
          title="Validation Pipeline"
          description="Dual-view draft verification — activity logs and matter assignment."
        />
        <div className="p-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Validation Pipeline"
          description="Dual-view draft verification — activity logs and matter assignment."
        />
        <div className="p-8">
          <div className="text-center text-destructive">{error}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Validation Pipeline"
        description="Dual-view draft verification — activity logs and matter assignment."
      />
      <section className="grid flex-1 grid-cols-1 gap-4 p-8 lg:grid-cols-2">
        <UnassignedQueue
          drafts={drafts}
          selectedDraftId={selectedDraftId}
          onSelectDraft={setSelectedDraftId}
        />
        <AssignmentForm
          key={selectedDraftId}
          selectedDraft={selectedDraft || null}
          matters={matters}
          onApprove={handleApprove}
          onApproveAll={handleApproveAll}
          onMatterSearch={handleMatterSearch}
          onDraftUpdated={handleDraftUpdated}
        />
      </section>
    </>
  );
}
