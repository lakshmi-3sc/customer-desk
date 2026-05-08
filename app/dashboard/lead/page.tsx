"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, Clock, CheckCircle, TrendingUp, Users,
  ShieldAlert, ArrowUpRight, RefreshCw, Bot,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { InternalSummary } from "@/components/dashboard/InternalSummary";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { LucideIcon } from "lucide-react";

interface Stats {
  kpis: { totalOpen: number; slaBreaches: number; resolvedToday: number; escalated: number; csatScore: number; avgResolutionHrs: number };
  agentStats: { id: string; name: string; assigned: number; overdue: number; resolvedToday: number; avgResponseHrs: number }[];
  recentEscalations: { id: string; ticketKey: string | null; title: string; priority: string; escalatedAt: string; assignedTo: { name: string } | null; client: { name: string } }[];
  chartData: Record<string, any>[];
  aiStats: { routedToday: number; needsReview: number };
}

const PRIORITY_BAR_COLOR: Record<string, string> = {
  CRITICAL: "#ef4444", HIGH: "#f59e0b", MEDIUM: "#3b82f6", LOW: "#94a3b8",
};

interface KpiCard {
  label: string;
  value: string | number;
  sub: string;
  icon: LucideIcon;
  accent: string;
  iconCls: string;
  route: string | null;
}

export default function LeadDashboard() {
  const router = useRouter();
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lead/stats");
      if (res.ok) setData(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const kpiCards: KpiCard[] = data ? [
    { label: "Open Issues",     value: data.kpis.totalOpen,          sub: "across all agents", icon: AlertCircle, accent: "border-l-slate-400",   iconCls: "bg-slate-100 text-slate-500",    route: "/tickets" },
    { label: "SLA Breaches",    value: data.kpis.slaBreaches,        sub: "needs escalation",  icon: ShieldAlert, accent: "border-l-red-500",     iconCls: "bg-red-50 text-red-500",         route: "/tickets?sla=breached" },
    { label: "Avg Resolution",  value: `${data.kpis.avgResolutionHrs}h`, sub: "per ticket",   icon: Clock,       accent: "border-l-blue-400",    iconCls: "bg-blue-50 text-blue-500",       route: null },
    { label: "CSAT Score",      value: `${data.kpis.csatScore}%`,    sub: "customer satisfaction", icon: TrendingUp, accent: "border-l-emerald-400", iconCls: "bg-emerald-50 text-emerald-600", route: "/lead/reports" },
  ] : [];

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F8F9FB] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={<span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Lead Dashboard</span>}
          right={
            <button onClick={load} className="p-1.5 rounded-md text-slate-400 hover:text-[#0052CC] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            {loading ? [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border-l-[3px] border-l-slate-200 border border-slate-200 dark:border-slate-800 px-4 py-3 animate-pulse">
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-24 mb-3" />
                <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-12 mb-2" />
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-20" />
              </div>
            )) : kpiCards.map(({ label, value, sub, icon: Icon, accent, iconCls, route }) => (
              <button
                key={label}
                onClick={() => route && router.push(route)}
                disabled={!route}
                className={`bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border-l-[3px] ${accent} border border-slate-200 dark:border-slate-800 shadow-sm text-left transition-all ${route ? "cursor-pointer hover:shadow-md" : "cursor-default"}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
                  <div className={`p-1 rounded-md ${iconCls}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-[22px] font-bold tabular-nums text-slate-900 dark:text-slate-50 leading-none">{value}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{sub}</p>
              </button>
            ))}
          </div>

          {/* Operations Summary */}
          <InternalSummary />

          <div className="grid grid-cols-3 gap-5">
            {/* Agent performance table */}
            <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Agent Performance</h3>
                <button onClick={() => router.push("/lead/workload")} className="flex items-center gap-0.5 text-xs text-[#0052CC] dark:text-blue-400 hover:underline font-medium">
                  Workload <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              {loading ? (
                <div className="space-y-2.5">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                      {["Agent", "Assigned", "Resolved", "Overdue", "Avg Response"].map((h) => (
                        <th key={h} className="text-left py-2 px-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {(data?.agentStats ?? []).map((agent) => (
                      <tr key={agent.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#0052CC] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                              {agent.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">{agent.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-slate-700 dark:text-slate-300 font-semibold text-xs tabular-nums">{agent.assigned}</td>
                        <td className="py-2.5 px-2 text-emerald-600 font-semibold text-xs tabular-nums">{agent.resolvedToday}</td>
                        <td className="py-2.5 px-2">
                          <span className={`text-xs font-semibold tabular-nums ${agent.overdue > 0 ? "text-red-600" : "text-slate-400"}`}>{agent.overdue}</span>
                        </td>
                        <td className="py-2.5 px-2 text-slate-500 text-xs">{agent.avgResponseHrs}h</td>
                      </tr>
                    ))}
                    {(data?.agentStats ?? []).length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">No agents found</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Escalation alerts */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Escalations</h3>
                  <button onClick={() => router.push("/lead/escalations")} className="text-xs text-[#0052CC] dark:text-blue-400 hover:underline flex items-center gap-0.5 font-medium">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
                {loading ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
                ) : (data?.recentEscalations ?? []).length === 0 ? (
                  <div className="py-5 text-center">
                    <CheckCircle className="w-7 h-7 mx-auto mb-1.5 text-emerald-300 dark:text-emerald-700" />
                    <p className="text-xs text-slate-400">No active escalations</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {(data?.recentEscalations ?? []).slice(0, 3).map((esc) => (
                      <button key={esc.id} onClick={() => router.push(`/tickets/${esc.ticketKey ?? esc.id}`)}
                        className="w-full text-left p-2.5 rounded-lg border border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                          <span className="text-[11px] font-mono font-semibold text-slate-500">{esc.ticketKey ?? esc.id.slice(0, 8)}</span>
                          <span className="text-[11px] text-slate-400 ml-auto truncate">{esc.client.name}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{esc.title}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* AI routing summary */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-800/50 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/40">
                    <Bot className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI Routing</h3>
                </div>
                {loading ? (
                  <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Routed <span className="font-semibold text-slate-900 dark:text-slate-100">{data?.aiStats.routedToday ?? 0}</span> issues today
                    </p>
                    {(data?.aiStats.needsReview ?? 0) > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        <span className="font-semibold">{data?.aiStats.needsReview}</span> need{(data?.aiStats.needsReview ?? 0) === 1 ? "s" : ""} manual review
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Issue chart */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Open Issues by Customer & Priority</h3>
            {loading ? (
              <div className="h-52 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ) : (data?.chartData ?? []).length === 0 ? (
              <div className="h-32 flex items-center justify-center text-sm text-slate-400">No open issues</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.chartData ?? []} margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {Object.keys(PRIORITY_BAR_COLOR).map((p) => (
                    <Bar key={p} dataKey={p} stackId="a" fill={PRIORITY_BAR_COLOR[p]} name={p.charAt(0) + p.slice(1).toLowerCase()} radius={p === "CRITICAL" ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
