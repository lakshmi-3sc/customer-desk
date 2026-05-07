"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import type { Summary } from "@prisma/client";

interface SummaryMetrics {
  completionRate?: number;
  slaStatus?: string;
  totalSubmitted?: number;
  resolved?: number;
  openIssues?: number;
}

type ClientSummary = Summary & {
  title?: string;
  htmlContent?: string;
  metrics?: SummaryMetrics;
};

interface ClientSummaryViewProps {
  summaries?: ClientSummary[];
  loading?: boolean;
}

export function ClientSummaryView({
  summaries = [],
  loading = false,
}: ClientSummaryViewProps) {
  const [selectedSummary, setSelectedSummary] = useState<ClientSummary | null>(null);
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
    const metrics = selectedSummary.metrics;
    const completionRate = metrics?.completionRate || 0;
    const slaStatus = metrics?.slaStatus || "Checking...";
    const isSLAOk = !slaStatus.includes("Breach");

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
              Download
            </button>
          </div>

          {/* SLA Status Alert */}
          <div
            className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${
              isSLAOk
                ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
            }`}
          >
            {isSLAOk ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            )}
            <span
              className={`text-sm font-medium ${
                isSLAOk
                  ? "text-emerald-800 dark:text-emerald-300"
                  : "text-amber-800 dark:text-amber-300"
              }`}
            >
              {slaStatus}
            </span>
          </div>

          {metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <MetricCard
                label="Total Submitted"
                value={metrics.totalSubmitted || "—"}
              />
              <MetricCard
                label="Resolved"
                value={metrics.resolved || "—"}
                highlight
              />
              <MetricCard
                label="Completion Rate"
                value={`${metrics.completionRate || 0}%`}
              />
              <MetricCard
                label="Currently Open"
                value={metrics.openIssues || "—"}
              />
            </div>
          )}

          {selectedSummary.htmlContent && (
            <div
              className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: selectedSummary.htmlContent }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summaries.length === 0 ? (
        <div className="text-center py-10">
          <TrendingUp className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No summaries available yet. You'll receive your first summary next
            week.
          </p>
        </div>
      ) : (
        summaries.map((summary) => {
          const metrics = summary.metrics;
          const completionRate = metrics?.completionRate || 0;
          const isSLAOk = !metrics?.slaStatus?.includes("Breach");

          return (
            <button
              key={summary.id}
              onClick={() => {
                setSelectedSummary(summary);
                setView("detail");
              }}
              className="w-full text-left p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#0052CC] dark:hover:border-blue-500 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {summary.title ?? "Summary"}
                  </h3>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(
                        new Date(summary.periodStart),
                        "MMM dd, yyyy"
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      {isSLAOk ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      )}
                      {metrics?.slaStatus || "SLA Status Unknown"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {completionRate}%
                    </div>
                    <div className="text-xs text-slate-500">Completion</div>
                  </div>
                  <Eye className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
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
      <p
        className={`text-xs font-semibold uppercase mb-2 ${
          highlight
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-slate-500 dark:text-slate-400"
        }`}
      >
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
