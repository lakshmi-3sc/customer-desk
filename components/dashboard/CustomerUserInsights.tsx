"use client";

import { Zap, AlertCircle, CheckCircle2, Clock, TrendingDown } from "lucide-react";

interface InsightIssue {
  status: string;
  createdAt?: string;
  updatedAt: string;
  slaBreached?: boolean;
  slaBreachRisk?: boolean;
}

export function CustomerUserInsights({
  issues,
  loading,
}: {
  issues: InsightIssue[];
  loading: boolean;
}) {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const raisedThisWeek = issues.filter((issue) => {
    const date = new Date(issue.createdAt ?? issue.updatedAt);
    return date >= weekStart;
  }).length;

  const activeTickets = issues.filter((issue) =>
    ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"].includes(issue.status),
  ).length;

  const recentlyResolved = issues.filter((issue) => {
    if (issue.status !== "RESOLVED" && issue.status !== "CLOSED") return false;
    return new Date(issue.updatedAt) >= weekStart;
  }).length;

  const delayedTickets = issues.filter((issue) => issue.slaBreached || issue.slaBreachRisk).length;

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="h-4 w-28 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <div className="h-4 w-4 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </div>
        <div className="p-4 space-y-2">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 flex items-start gap-3">
              <div className="h-5 w-5 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-3 w-44 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Weekly Insights</h3>
        <Zap className="w-4 h-4 text-slate-400" />
      </div>

      <div className="p-4 space-y-2">
        <InsightBox
          icon={<Zap className="w-5 h-5" />}
          title={`${raisedThisWeek} tickets raised`}
          description="You raised this week"
          iconColor="text-amber-500"
        />

        <InsightBox
          icon={<Clock className="w-5 h-5" />}
          title={`${activeTickets} active`}
          description={`${activeTickets} open, acknowledged, or in progress`}
          iconColor="text-blue-500"
        />

        <InsightBox
          icon={<CheckCircle2 className="w-5 h-5" />}
          title={`${recentlyResolved} resolved`}
          description="Resolved in the last 7 days"
          iconColor="text-emerald-600"
        />

        {delayedTickets > 0 ? (
          <InsightBox
            icon={<AlertCircle className="w-5 h-5" />}
            title={`${delayedTickets} ticket${delayedTickets !== 1 ? "s" : ""} need attention`}
            description="SLA breached or at risk"
            iconColor="text-red-500"
          />
        ) : (
          <InsightBox
            icon={<TrendingDown className="w-5 h-5" />}
            title="No delays"
            description="All your tickets are on track"
            iconColor="text-emerald-600"
          />
        )}
      </div>
    </div>
  );
}

function InsightBox({
  icon,
  title,
  description,
  iconColor,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconColor: string;
}) {
  return (
    <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex items-start gap-3 bg-slate-50/60 dark:bg-slate-950/30">
      <div className={`flex-shrink-0 mt-0.5 ${iconColor}`}>{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {title}
        </p>
        <p className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}
