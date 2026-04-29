"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, TrendingDown, Clock } from "lucide-react";
import { Summary } from "@prisma/client";

interface RiskAlertWidgetProps {
  limit?: number;
}

interface RiskAlert {
  clientName: string;
  clientId: string;
  type: "sla_breach" | "escalation" | "overdue";
  severity: "critical" | "high" | "medium";
  message: string;
  value: number;
}

export function RiskAlertWidget({ limit = 5 }: RiskAlertWidgetProps) {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/summaries?isInternal=true&type=WEEKLY");
      if (res.ok) {
        const { summaries } = await res.json();

        // Extract risks from summaries
        const risks: RiskAlert[] = [];

        summaries.forEach((summary: Summary) => {
          const metrics = summary.metrics as any;

          if (metrics?.slaBreaches && metrics.slaBreaches > 0) {
            risks.push({
              clientName: "Internal",
              clientId: summary.clientId,
              type: "sla_breach",
              severity: metrics.slaBreaches > 3 ? "critical" : "high",
              message: `${metrics.slaBreaches} SLA breach${metrics.slaBreaches > 1 ? "es" : ""}`,
              value: metrics.slaBreaches,
            });
          }

          if (metrics?.escalations && metrics.escalations > 0) {
            risks.push({
              clientName: "Internal",
              clientId: summary.clientId,
              type: "escalation",
              severity: metrics.escalations > 2 ? "critical" : "high",
              message: `${metrics.escalations} escalation${metrics.escalations > 1 ? "s" : ""}`,
              value: metrics.escalations,
            });
          }

          if (metrics?.totalOpen && metrics.totalOpen > 20) {
            risks.push({
              clientName: "Internal",
              clientId: summary.clientId,
              type: "overdue",
              severity: metrics.totalOpen > 30 ? "critical" : "medium",
              message: `${metrics.totalOpen} open issues`,
              value: metrics.totalOpen,
            });
          }
        });

        setAlerts(risks.slice(0, limit));
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            Risk Alerts
          </h3>
          {alerts.length > 0 && (
            <span className="ml-2 inline-block px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold rounded-full">
              {alerts.length}
            </span>
          )}
        </div>
        <button
          onClick={fetchAlerts}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Refresh
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ✅ No active risk alerts
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border-l-4 ${
                  alert.severity === "critical"
                    ? "bg-red-50 dark:bg-red-950/30 border-red-500"
                    : alert.severity === "high"
                      ? "bg-orange-50 dark:bg-orange-950/30 border-orange-500"
                      : "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-500"
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      alert.severity === "critical"
                        ? "text-red-600 dark:text-red-400"
                        : alert.severity === "high"
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-yellow-600 dark:text-yellow-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        alert.severity === "critical"
                          ? "text-red-800 dark:text-red-300"
                          : alert.severity === "high"
                            ? "text-orange-800 dark:text-orange-300"
                            : "text-yellow-800 dark:text-yellow-300"
                      }`}
                    >
                      {alert.type === "sla_breach"
                        ? "🚨 SLA Breach"
                        : alert.type === "escalation"
                          ? "🔺 Escalation"
                          : "⏰ Overdue"}
                    </p>
                    <p
                      className={`text-sm mt-1 ${
                        alert.severity === "critical"
                          ? "text-red-700 dark:text-red-400"
                          : alert.severity === "high"
                            ? "text-orange-700 dark:text-orange-400"
                            : "text-yellow-700 dark:text-yellow-400"
                      }`}
                    >
                      {alert.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
