"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/features/page-header";
import { MetricsGrid } from "@/components/features/dashboard/metrics-grid";
import { TargetProgressGauge } from "@/components/features/dashboard/target-progress-gauge";
import { SystemStatusLog } from "@/components/features/dashboard/system-status-log";

interface DashboardData {
  todayBillableHours: number;
  monthBillableHours: number;
  monthRealizedValue: number;
  monthlyTargetHours: number;
  pendingDraftCount: number;
  activeMattersCount: number;
  leakedRecoveryValue: number;
  recentActivity: Array<{
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
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/org/dashboard");
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <>
        <PageHeader
          title="Executive Dashboard"
          description="Firm-wide billable performance, leakage metrics, and recent activity."
        />
        <div className="p-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <PageHeader
          title="Executive Dashboard"
          description="Firm-wide billable performance, leakage metrics, and recent activity."
        />
        <div className="p-8">
          <div className="text-center text-destructive">
            {error || "Failed to load dashboard data"}
          </div>
        </div>
      </>
    );
  }

  const targetProgress = (data.monthBillableHours / data.monthlyTargetHours) * 100;

  return (
    <>
      <PageHeader
        title="Executive Dashboard"
        description="Firm-wide billable performance, leakage metrics, and recent activity."
      />
      <div className="p-8 space-y-6">
        <MetricsGrid
          monthRealizedValue={data.monthRealizedValue}
          leakedRecoveryValue={data.leakedRecoveryValue}
          activeMattersCount={data.activeMattersCount}
          targetProgress={targetProgress}
        />
        
        <div className="grid gap-6 md:grid-cols-2">
          <TargetProgressGauge
            actualHours={data.monthBillableHours}
            targetHours={data.monthlyTargetHours}
          />
          <SystemStatusLog recentActivity={data.recentActivity} />
        </div>
      </div>
    </>
  );
}
