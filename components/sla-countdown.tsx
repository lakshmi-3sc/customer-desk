"use client";

import { Clock, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { calculateTimeRemaining } from "@/lib/sla";

interface SLACountdownProps {
  slaDueAt: string | null;
  slaBreached: boolean;
  slaBreachRisk: boolean;
}

export function SLACountdown({ slaDueAt, slaBreached, slaBreachRisk }: SLACountdownProps) {
  const date = slaDueAt ? new Date(slaDueAt) : null;
  const remaining = calculateTimeRemaining(date);

  const statusStyles = {
    breached: "bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-700",
    "at-risk": "bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-700",
    healthy: "bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-700",
    "no-sla": "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700",
  };

  const textStyles = {
    breached: "text-red-700 dark:text-red-300",
    "at-risk": "text-orange-700 dark:text-orange-300",
    healthy: "text-green-700 dark:text-green-300",
    "no-sla": "text-slate-600 dark:text-slate-400",
  };

  const icons = {
    breached: <AlertTriangle className="w-4 h-4" />,
    "at-risk": <AlertCircle className="w-4 h-4" />,
    healthy: <CheckCircle2 className="w-4 h-4" />,
    "no-sla": <Clock className="w-4 h-4" />,
  };

  return (
    <div className={`border rounded-lg p-4 ${statusStyles[remaining.status]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={textStyles[remaining.status]}>{icons[remaining.status]}</span>
        <h4 className={`font-semibold text-sm ${textStyles[remaining.status]}`}>
          {remaining.status === "breached" ? "SLA Breached" : "SLA Status"}
        </h4>
      </div>
      <p className={`text-lg font-bold ${textStyles[remaining.status]}`}>{remaining.displayText}</p>
      {date && (
        <p className={`text-xs mt-2 ${textStyles[remaining.status]}`}>
          Due: {date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}
