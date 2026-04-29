"use client";

import { useState, useEffect } from "react";
import { TrendingDown, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface Summary {
  raised: number;
  resolved: number;
  pending: number;
  slaBreaches: number;
  avgResolutionHours: number;
  blocker: {
    id: string;
    title: string;
    priority: string;
    category: string;
  } | null;
  period: "WEEKLY" | "MONTHLY";
}

export function WeeklySummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"WEEKLY" | "MONTHLY">("WEEKLY");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, [period]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/summaries?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Failed to fetch summary:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 animate-pulse">
        <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded" />
      </div>
    );
  }

  if (!summary) return null;

  const resolutionTrend = summary.avgResolutionHours < 20 ? "↓ Improving" : "↑ Slower";

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors"
      >
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            📊 {period === "WEEKLY" ? "Weekly" : "Monthly"} Summary
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {period === "WEEKLY" ? "Last 7 days" : "Last 30 days"}
          </p>
        </div>
        <div className={`transform transition-transform ${expanded ? "rotate-180" : ""}`}>
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </button>

      {/* Collapsed View - Key Metrics */}
      {!expanded && (
        <div className="px-5 pb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <div className="text-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">Resolved</p>
              <p className="font-bold text-emerald-600 dark:text-emerald-400">{summary.resolved}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <div className="text-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">Open</p>
              <p className="font-bold text-amber-600 dark:text-amber-400">{summary.pending}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <div className="text-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">Avg Time</p>
              <p className="font-bold text-blue-600 dark:text-blue-400">{summary.avgResolutionHours}h</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-slate-600" />
            <div className="text-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">Trend</p>
              <p className="font-bold text-slate-600 dark:text-slate-300 text-xs">{resolutionTrend}</p>
            </div>
          </div>
        </div>
      )}

      {/* Expanded View - Pointers */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-blue-200 dark:border-blue-800 pt-4 space-y-3">
          {/* Period Toggle */}
          <div className="flex gap-2 mb-3">
            {(["WEEKLY", "MONTHLY"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  period === p
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                {p === "WEEKLY" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>

          {/* Metrics as Pointers */}
          <div className="space-y-2 text-sm">
            <Pointer label="Issues raised" value={summary.raised} />
            <Pointer label="Resolved" value={summary.resolved} highlight />
            <Pointer label="Pending SLA risk" value={summary.slaBreaches} alert={summary.slaBreaches > 0} />
            <Pointer label="Open issues" value={summary.pending} />
            <Pointer label="Avg resolution time" value={`${summary.avgResolutionHours}h`} />
            <Pointer label="Trend" value={resolutionTrend} />
          </div>

          {/* Key Blocker */}
          {summary.blocker && (
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase mb-2">
                🔴 Key Blocker
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {summary.blocker.title}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {summary.blocker.priority} • {summary.blocker.category}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Pointer({
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
    <div className="flex items-center justify-between">
      <span className={`${
        highlight
          ? "text-emerald-700 dark:text-emerald-300"
          : alert
            ? "text-red-700 dark:text-red-300"
            : "text-slate-700 dark:text-slate-300"
      }`}>
        • {label}
      </span>
      <span className={`font-semibold ${
        highlight
          ? "text-emerald-600 dark:text-emerald-400"
          : alert
            ? "text-red-600 dark:text-red-400"
            : "text-slate-900 dark:text-slate-100"
      }`}>
        {value}
      </span>
    </div>
  );
}
