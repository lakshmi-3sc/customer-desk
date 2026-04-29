"use client";

import { useState, useEffect } from "react";
import { TrendingUp, AlertTriangle, CheckCircle2, Zap, RefreshCw, TrendingDown } from "lucide-react";

interface AdminInsights {
  totalRaised: number;
  change: number;
  resolved: number;
  inProgress: number;
  slaRisks: number;
  critical: number;
  recentResolutions: string[];
  overallHealth: "improving" | "stable" | "needs_attention";
}

export function CustomerAdminInsights() {
  const [insights, setInsights] = useState<AdminInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/summaries?period=WEEKLY");
      if (res.ok) {
        const data = await res.json();
        const summary = data.summary;

        if (summary) {
          // Determine overall health
          let health: "improving" | "stable" | "needs_attention" = "stable";
          if (summary.slaBreaches > 0) health = "needs_attention";
          if (summary.resolved > summary.raised / 2) health = "improving";

          setInsights({
            totalRaised: summary.raised,
            change: summary.change || 0,
            resolved: summary.resolved,
            inProgress: summary.pending,
            slaRisks: summary.slaBreaches,
            critical: 0, // Would come from actual data
            recentResolutions: [],
            overallHealth: health,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !insights) return null;

  const changeTrend = insights.change > 0 ? `↑ +${insights.change}` : insights.change < 0 ? `↓ ${insights.change}` : "→";
  const changeColor = insights.change > 0 ? "text-red-600" : insights.change < 0 ? "text-green-600" : "text-slate-600";
  const healthColor =
    insights.overallHealth === "improving"
      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
      : insights.overallHealth === "stable"
        ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
        : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <Zap className="w-5 h-5 text-amber-500" />
        Weekly Overview
      </h3>

      <div className="space-y-2">
        {/* Ticket Volume Trend */}
        <InsightBox
          icon={<TrendingUp className="w-5 h-5" />}
          title={`${insights.totalRaised} total tickets`}
          description={`${changeTrend} vs last week`}
          color={`bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800`}
          textColor="text-yellow-800 dark:text-yellow-300"
          trendColor={changeColor}
        />

        {/* Resolution Rate */}
        <InsightBox
          icon={<CheckCircle2 className="w-5 h-5" />}
          title={`${insights.resolved} resolved`}
          description={`${insights.inProgress} in progress - ${Math.round((insights.resolved / (insights.totalRaised || 1)) * 100)}% completion`}
          color="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
          textColor="text-green-800 dark:text-green-300"
          highlight
        />

        {/* SLA & Critical Issues */}
        {insights.slaRisks > 0 ? (
          <InsightBox
            icon={<AlertTriangle className="w-5 h-5" />}
            title={`${insights.slaRisks} SLA risks detected`}
            description="Tickets approaching or breaching SLA - immediate action recommended"
            color="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
            textColor="text-red-800 dark:text-red-300"
            alert
          />
        ) : (
          <InsightBox
            icon={<CheckCircle2 className="w-5 h-5" />}
            title="All SLAs met ✓"
            description="No risks detected - team is on track"
            color="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
            textColor="text-emerald-800 dark:text-emerald-300"
            highlight
          />
        )}

        {/* Overall Health Status */}
        <div className={`p-3 rounded-lg border flex items-start gap-3 ${healthColor}`}>
          <div className="flex-shrink-0 mt-0.5">
            {insights.overallHealth === "improving" && <TrendingUp className="w-5 h-5" />}
            {insights.overallHealth === "stable" && <RefreshCw className="w-5 h-5" />}
            {insights.overallHealth === "needs_attention" && <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <p className={`text-sm font-semibold`}>
              Project Health: <span className="capitalize">{insights.overallHealth.replace("_", " ")}</span>
            </p>
            <p className={`text-xs mt-0.5 opacity-85`}>
              {insights.overallHealth === "improving" &&
                "Great momentum! Team is resolving issues faster than they come in."}
              {insights.overallHealth === "stable" && "Steady progress. Keep up the good work."}
              {insights.overallHealth === "needs_attention" &&
                "Focus needed. Review high-priority items and escalations."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightBox({
  icon,
  title,
  description,
  color,
  textColor,
  trendColor,
  alert = false,
  highlight = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  textColor: string;
  trendColor?: string;
  alert?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg border flex items-start gap-3 ${color}`}>
      <div className={`flex-shrink-0 mt-0.5 ${textColor}`}>{icon}</div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${textColor} ${highlight ? "font-bold" : ""}`}>
          {title}
        </p>
        <p className={`text-xs mt-0.5 ${textColor} opacity-85`}>{description}</p>
      </div>
    </div>
  );
}
