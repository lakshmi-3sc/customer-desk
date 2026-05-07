"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Download,
  Eye,
  TrendingUp,
  AlertCircle,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Summary } from "@prisma/client";

interface SummaryMetrics {
  totalOpen?: number;
  resolved?: number;
  slaBreaches?: number;
}

type InternalSummary = Summary & {
  title?: string;
  htmlContent?: string;
  metrics?: SummaryMetrics;
};

interface InternalSummaryViewProps {
  summaries?: InternalSummary[];
  loading?: boolean;
}

export function InternalSummaryView({
  summaries = [],
  loading = false,
}: InternalSummaryViewProps) {
  const [selectedSummary, setSelectedSummary] = useState<InternalSummary | null>(null);
  const [view, setView] = useState<"list" | "detail">("list");

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (view === "detail" && selectedSummary) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-2 text-[#0052CC] hover:underline text-sm"
        >
          ← Back to summaries
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {selectedSummary.title ?? "Summary"}
              </h2>
              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(selectedSummary.periodStart), "MMM dd, yyyy")}
                  {" — "}
                  {format(new Date(selectedSummary.periodEnd), "MMM dd, yyyy")}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                const element = document.createElement("a");
                element.href = `data:text/html,${encodeURIComponent(selectedSummary.htmlContent || "")}`;
                element.download = `summary-${selectedSummary.id}.html`;
                element.click();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#0052CC] text-white rounded-lg hover:bg-[#0747A6] transition-colors"
            >
              <Download className="w-4 h-4" />
              Download HTML
            </button>
          </div>

          {selectedSummary.metrics && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {/* Render metrics from JSON */}
              {typeof selectedSummary.metrics === "object" && (
                <>
                  <MetricCard
                    label="Total Open"
                    value={selectedSummary.metrics.totalOpen || "-"}
                    icon={AlertCircle}
                  />
                  <MetricCard
                    label="Resolved"
                    value={selectedSummary.metrics.resolved || "-"}
                    icon={TrendingUp}
                  />
                  <MetricCard
                    label="SLA Breaches"
                    value={selectedSummary.metrics.slaBreaches || "-"}
                    icon={AlertCircle}
                  />
                </>
              )}
            </div>
          )}

          <div className="prose prose-sm dark:prose-invert max-w-none">
            {selectedSummary.htmlContent && (
              <div
                className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: selectedSummary.htmlContent }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summaries.length === 0 ? (
        <div className="text-center py-10">
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No summaries found. Summaries are generated automatically every
            Monday and on the 1st of each month.
          </p>
        </div>
      ) : (
        summaries.map((summary) => (
          <button
            key={summary.id}
            onClick={() => {
              setSelectedSummary(summary);
              setView("detail");
            }}
            className="w-full text-left p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#0052CC] dark:hover:border-blue-500 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  {summary.title ?? "Summary"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {format(new Date(summary.periodStart), "MMM dd, yyyy")}
                  {" — "}
                  {format(new Date(summary.periodEnd), "MMM dd, yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
                  {summary.type}
                </span>
                <Eye className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
}) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
          {label}
        </p>
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}
