"use client";

import { useState } from "react";
import { ChevronDown, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

interface SummaryMetrics {
  totalSubmitted?: number;
  resolved?: number;
  completionRate?: number;
  slaStatus?: string;
  openIssues?: number;
  avgResolutionHours?: number;
  avgResolutionTime?: string;
  totalOpen?: number;
  slaBreaches?: number;
  escalations?: number;
}

interface SummaryCardProps {
  title?: string;
  metrics: SummaryMetrics;
  isExpanded?: boolean;
  onToggle?: () => void;
  type?: "client" | "internal";
  period?: string;
}

export function SummaryCard({
  title = "Weekly Summary",
  metrics,
  isExpanded = false,
  onToggle,
  type = "client",
  period = "Last 7 days",
}: SummaryCardProps) {
  const [expanded, setExpanded] = useState(isExpanded);

  const handleToggle = () => {
    setExpanded(!expanded);
    onToggle?.();
  };

  const isSLAOk =
    !metrics.slaStatus || !metrics.slaStatus.includes("Breach");

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800 overflow-hidden">
      {/* Collapsed Header */}
      <button
        onClick={handleToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {period}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Collapsed Content (Key Metrics) */}
      {!expanded && (
        <div className="px-5 pb-4 flex flex-wrap gap-4">
          {type === "client" ? (
            <>
              {metrics.resolved !== undefined && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    <strong>{metrics.resolved}</strong> resolved
                  </span>
                </div>
              )}
              {metrics.openIssues !== undefined && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    <strong>{metrics.openIssues}</strong> open
                  </span>
                </div>
              )}
              {metrics.completionRate !== undefined && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    <strong>{metrics.completionRate}%</strong> complete
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              {metrics.totalOpen !== undefined && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    <strong>{metrics.totalOpen}</strong> open
                  </span>
                </div>
              )}
              {metrics.resolved !== undefined && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    <strong>{metrics.resolved}</strong> resolved
                  </span>
                </div>
              )}
              {metrics.slaBreaches !== undefined && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    <strong>{metrics.slaBreaches}</strong> SLA breaches
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Expanded Content */}
      {expanded && (
        <div className="px-5 pb-5 pt-2 border-t border-blue-200 dark:border-blue-800 space-y-4">
          {/* SLA Alert */}
          {metrics.slaStatus && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 ${
                isSLAOk
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
              }`}
            >
              {isSLAOk ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              )}
              <span
                className={`text-sm font-medium ${
                  isSLAOk
                    ? "text-emerald-800 dark:text-emerald-300"
                    : "text-amber-800 dark:text-amber-300"
                }`}
              >
                {metrics.slaStatus}
              </span>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {type === "client" ? (
              <>
                {metrics.totalSubmitted !== undefined && (
                  <MetricBox
                    label="Total Submitted"
                    value={metrics.totalSubmitted}
                  />
                )}
                {metrics.resolved !== undefined && (
                  <MetricBox
                    label="Resolved"
                    value={metrics.resolved}
                    highlight
                  />
                )}
                {metrics.completionRate !== undefined && (
                  <MetricBox
                    label="Completion Rate"
                    value={`${metrics.completionRate}%`}
                  />
                )}
                {metrics.openIssues !== undefined && (
                  <MetricBox label="Currently Open" value={metrics.openIssues} />
                )}
              </>
            ) : (
              <>
                {metrics.totalOpen !== undefined && (
                  <MetricBox label="Total Open" value={metrics.totalOpen} />
                )}
                {metrics.resolved !== undefined && (
                  <MetricBox label="Resolved" value={metrics.resolved} />
                )}
                {metrics.slaBreaches !== undefined && (
                  <MetricBox
                    label="SLA Breaches"
                    value={metrics.slaBreaches}
                    alert={metrics.slaBreaches > 0}
                  />
                )}
                {metrics.escalations !== undefined && (
                  <MetricBox label="Escalations" value={metrics.escalations} />
                )}
              </>
            )}
          </div>

          {/* Time Metrics */}
          {(metrics.avgResolutionHours || metrics.avgResolutionTime) && (
            <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                Performance
              </p>
              <div className="text-sm text-slate-700 dark:text-slate-300">
                Avg resolution time:{" "}
                <strong>
                  {metrics.avgResolutionTime ||
                    `${metrics.avgResolutionHours}h`}
                </strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricBox({
  label,
  value,
  highlight = false,
  alert = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  alert?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-lg border ${
        highlight
          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
          : alert
            ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase mb-1 ${
          highlight
            ? "text-emerald-600 dark:text-emerald-400"
            : alert
              ? "text-red-600 dark:text-red-400"
              : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-2xl font-bold ${
          highlight
            ? "text-emerald-600 dark:text-emerald-400"
            : alert
              ? "text-red-600 dark:text-red-400"
              : "text-slate-900 dark:text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
