"use client";

import { useState, useEffect } from "react";
import { TrendingUp, AlertTriangle, Users } from "lucide-react";

interface InternalSummary {
  totalRaised: number;
  change: number;
  prevTotal: number;
  resolved: number;
  avgResolutionHours: number;
  slaBreaches: number;
  slaAtRisk: number;
  totalOpen: number;
  topAgentName: string;
  topAgentLoad: number;
  period: "WEEKLY" | "MONTHLY";
}

export function InternalSummary() {
  const [summary, setSummary] = useState<InternalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"WEEKLY" | "MONTHLY">("WEEKLY");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, [period]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/summaries?period=${period}&internal=true`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Failed to fetch internal summary:", error);
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

  const volumeTrend = summary.change > 0 ? `↑ +${summary.change}` : summary.change < 0 ? `↓ ${summary.change}` : "→ Stable";
  const changeColor = summary.change > 0 ? "text-red-600" : summary.change < 0 ? "text-green-600" : "text-slate-600";

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-purple-100/50 dark:hover:bg-purple-900/20 transition-colors"
      >
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            📊 {period === "WEEKLY" ? "Weekly" : "Monthly"} Operations
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
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <div className="text-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Raised</p>
              <p className="font-bold text-purple-600 dark:text-purple-400">{summary.totalRaised}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${changeColor}`}>{volumeTrend}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <div className="text-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">SLA Risk</p>
              <p className="font-bold text-red-600 dark:text-red-400">{summary.slaBreaches + summary.slaAtRisk}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <div className="text-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">Max Load</p>
              <p className="font-bold text-blue-600 dark:text-blue-400">{summary.topAgentLoad}</p>
            </div>
          </div>
        </div>
      )}

      {/* Expanded View - Detailed Pointers */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-purple-200 dark:border-purple-800 pt-4 space-y-3">
          {/* Period Toggle */}
          <div className="flex gap-2 mb-3">
            {(["WEEKLY", "MONTHLY"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  period === p
                    ? "bg-purple-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                {p === "WEEKLY" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>

          {/* Ticket Volume */}
          <div className="pt-2 space-y-2">
            <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Ticket Volume</h4>
            <Pointer label="Total raised" value={summary.totalRaised} />
            <Pointer label="Previous period" value={summary.prevTotal} />
            <Pointer label="Change" value={volumeTrend} highlight={summary.change < 0} alert={summary.change > 5} />
          </div>

          {/* Resolution Performance */}
          <div className="pt-3 border-t border-purple-200 dark:border-purple-800 space-y-2">
            <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Resolution Performance</h4>
            <Pointer label="Resolved" value={summary.resolved} highlight />
            <Pointer label="Avg resolution time" value={`${summary.avgResolutionHours}h`} />
            <Pointer label="Currently open" value={summary.totalOpen} />
          </div>

          {/* SLA Risks */}
          {(summary.slaBreaches > 0 || summary.slaAtRisk > 0) && (
            <div className="pt-3 border-t border-purple-200 dark:border-purple-800 space-y-2">
              <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">🚨 SLA Risks</h4>
              <Pointer label="Breached" value={summary.slaBreaches} alert={summary.slaBreaches > 0} />
              <Pointer label="At risk" value={summary.slaAtRisk} alert={summary.slaAtRisk > 0} />
            </div>
          )}

          {/* Team Insights */}
          <div className="pt-3 border-t border-purple-200 dark:border-purple-800 space-y-2">
            <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Team Insights</h4>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">• Busiest agent</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{summary.topAgentName}</span>
            </div>
            <Pointer label="Their workload" value={summary.topAgentLoad} />
          </div>
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
          ? "text-green-700 dark:text-green-300"
          : alert
            ? "text-red-700 dark:text-red-300"
            : "text-slate-700 dark:text-slate-300"
      }`}>
        • {label}
      </span>
      <span className={`font-semibold ${
        highlight
          ? "text-green-600 dark:text-green-400"
          : alert
            ? "text-red-600 dark:text-red-400"
            : "text-slate-900 dark:text-slate-100"
      }`}>
        {value}
      </span>
    </div>
  );
}
