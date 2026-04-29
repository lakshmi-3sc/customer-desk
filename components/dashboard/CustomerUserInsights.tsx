"use client";

import { useState, useEffect } from "react";
import { Zap, AlertCircle, CheckCircle2, Clock, TrendingDown } from "lucide-react";

interface UserInsights {
  raisedThisWeek: number;
  activeTickets: { open: number; inProgress: number };
  recentlyResolved: number;
  delayedTickets: number;
  delayedTicketsList: string[];
}

export function CustomerUserInsights() {
  const [insights, setInsights] = useState<UserInsights | null>(null);
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
          setInsights({
            raisedThisWeek: summary.raised,
            activeTickets: {
              open: summary.pending,
              inProgress: summary.pending,
            },
            recentlyResolved: summary.resolved,
            delayedTickets: summary.slaBreaches,
            delayedTicketsList: [],
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

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <Zap className="w-5 h-5 text-amber-500" />
        Weekly Insights
      </h3>

      <div className="space-y-2">
        {/* Tickets Raised */}
        <InsightBox
          icon={<Zap className="w-5 h-5" />}
          title={`${insights.raisedThisWeek} tickets raised`}
          description="You raised this week"
          color="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800"
          textColor="text-yellow-800 dark:text-yellow-300"
        />

        {/* Active Status */}
        <InsightBox
          icon={<Clock className="w-5 h-5" />}
          title={`${insights.activeTickets.open} active`}
          description={`${insights.activeTickets.open} open, awaiting response`}
          color="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
          textColor="text-blue-800 dark:text-blue-300"
        />

        {/* Recently Resolved */}
        <InsightBox
          icon={<CheckCircle2 className="w-5 h-5" />}
          title={`${insights.recentlyResolved} resolved`}
          description="Great progress this week! ✓"
          color="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
          textColor="text-green-800 dark:text-green-300"
          highlight
        />

        {/* Delays/SLA Risk */}
        {insights.delayedTickets > 0 ? (
          <InsightBox
            icon={<AlertCircle className="w-5 h-5" />}
            title={`${insights.delayedTickets} ticket${insights.delayedTickets !== 1 ? "s" : ""} delayed`}
            description="May need attention - check expected updates"
            color="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
            textColor="text-red-800 dark:text-red-300"
            alert
          />
        ) : (
          <InsightBox
            icon={<TrendingDown className="w-5 h-5" />}
            title="No delays"
            description="All your tickets are on track 🎉"
            color="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
            textColor="text-emerald-800 dark:text-emerald-300"
            highlight
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
  color,
  textColor,
  alert = false,
  highlight = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  textColor: string;
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
