"use client";

import { useState, useEffect } from "react";
import { TrendingUp, AlertCircle, Calendar } from "lucide-react";
import type { Summary } from "@prisma/client";
import { format } from "date-fns";

interface ProjectSummaryMetrics {
  slaStatus?: string;
  totalSubmitted?: number;
  resolved?: number;
  completionRate?: number;
  openIssues?: number;
  issuesByCategory?: { category: string; count: number }[];
  recentlyResolved?: { id: string; title: string; resolvedAt: string | Date }[];
}

type ProjectSummary = Summary & {
  metrics?: ProjectSummaryMetrics;
};

interface ProjectSummarySectionProps {
  projectId: string;
  clientId: string;
}

export function ProjectSummarySection({
  projectId,
  clientId,
}: ProjectSummarySectionProps) {
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch(
          `/api/summaries?clientId=${clientId}&type=MONTHLY`
        );
        if (res.ok) {
          const { summaries } = await res.json();
          if (summaries && summaries.length > 0) {
            setSummary(summaries[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching summary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [clientId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          📊 Monthly summary will be available after the 1st of next month.
        </p>
      </div>
    );
  }

  const metrics = summary.metrics;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            📊 Monthly Project Summary
          </h3>
          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
            {format(new Date(summary.periodStart), "MMM yyyy")}
          </span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Project health and delivery metrics
        </p>
      </div>

      {/* Health Alert */}
      {metrics?.slaStatus && (
        <div
          className={`p-4 rounded-lg mb-6 flex items-start gap-3 ${
            metrics.slaStatus.includes("Breach")
              ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
              : "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
          }`}
        >
          <AlertCircle
            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              metrics.slaStatus.includes("Breach")
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          />
          <div>
            <p
              className={`font-semibold text-sm ${
                metrics.slaStatus.includes("Breach")
                  ? "text-amber-800 dark:text-amber-300"
                  : "text-emerald-800 dark:text-emerald-300"
              }`}
            >
              {metrics.slaStatus.includes("Breach")
                ? "⚠️ SLA at Risk"
                : "✅ SLA Compliant"}
            </p>
            <p
              className={`text-xs mt-1 ${
                metrics.slaStatus.includes("Breach")
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {metrics.slaStatus}
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {metrics?.totalSubmitted !== undefined && (
          <MetricTile
            label="Issues Submitted"
            value={metrics.totalSubmitted}
            icon="📥"
          />
        )}
        {metrics?.resolved !== undefined && (
          <MetricTile
            label="Issues Resolved"
            value={metrics.resolved}
            icon="✅"
            highlight
          />
        )}
        {metrics?.completionRate !== undefined && (
          <MetricTile
            label="Completion Rate"
            value={`${metrics.completionRate}%`}
            icon="📊"
          />
        )}
        {metrics?.openIssues !== undefined && (
          <MetricTile
            label="Currently Open"
            value={metrics.openIssues}
            icon="🔵"
          />
        )}
      </div>

      {/* Issues by Category */}
      {metrics?.issuesByCategory && metrics.issuesByCategory.length > 0 && (
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Issues by Category
          </h4>
          <div className="space-y-2">
            {metrics.issuesByCategory.map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {cat.category}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${
                          (cat.count / (metrics.totalSubmitted || 1)) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 w-8 text-right">
                    {cat.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Resolved */}
      {metrics?.recentlyResolved && metrics.recentlyResolved.length > 0 && (
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Recently Resolved Issues
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {metrics.recentlyResolved.map((issue) => (
              <div
                key={issue.id}
                className="p-2 rounded border border-slate-200 dark:border-slate-700 flex items-start gap-2"
              >
                <span className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5">
                  ✓
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                    {issue.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {format(new Date(issue.resolvedAt), "MMM dd, yyyy")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricTile({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string | number;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        highlight
          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
      }`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
        {label}
      </p>
      <p
        className={`text-2xl font-bold ${
          highlight
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-slate-900 dark:text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
