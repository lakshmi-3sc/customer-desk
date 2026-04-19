"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, Clock, CheckCircle, TrendingUp, Users, Zap,
  ShieldAlert, ArrowUpRight, RefreshCw, Bot,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Stats {
  kpis: { totalOpen: number; slaBreaches: number; resolvedToday: number; escalated: number; csatScore: number; avgResolutionHrs: number };
  agentStats: { id: string; name: string; assigned: number; overdue: number; resolvedToday: number; avgResponseHrs: number }[];
  recentEscalations: { id: string; ticketKey: string | null; title: string; priority: string; escalatedAt: string; assignedTo: { name: string } | null; client: { name: string } }[];
  chartData: Record<string, any>[];
  aiStats: { routedToday: number; needsReview: number };
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444", HIGH: "#f59e0b", MEDIUM: "#3b82f6", LOW: "#6b7280",
};

const PRIORITY_BAR_COLOR: Record<string, string> = {
  CRITICAL: "#ef4444", HIGH: "#f59e0b", MEDIUM: "#3b82f6", LOW: "#94a3b8",
};

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

  const kpiCards = data ? [
    { label: "Total Open Issues", value: data.kpis.totalOpen, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30", border: "border-l-red-500", route: "/tickets" },
    { label: "SLA Breaches", value: data.kpis.slaBreaches, icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-l-amber-500", route: "/tickets?sla=breached" },
    { label: "Avg Resolution", value: `${data.kpis.avgResolutionHrs}h`, icon: Clock, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-l-blue-500", route: null },
    { label: "CSAT Score", value: `${data.kpis.csatScore}%`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-l-emerald-500", route: "/lead/reports" },
  ] : [];

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={<span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Lead Dashboard</span>}
          right={
            <button onClick={load} className="p-1.5 rounded-md text-slate-500 hover:text-[#0052CC] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            {loading ? [...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse" />
            )) : kpiCards.map(({ label, value, icon: Icon, color, bg, border, route }) => (
              <button key={label} onClick={() => route && router.push(route)} disabled={!route}
                className={`${bg} p-4 rounded-xl border-l-4 ${border} border border-slate-200/50 dark:border-slate-800/50 text-left ${route ? "cursor-pointer hover:shadow-sm transition-shadow" : "cursor-default"}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Agent performance table */}
            <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Agent Performance</h3>
                <button onClick={() => router.push("/lead/workload")} className="flex items-center gap-1 text-xs text-[#0052CC] hover:underline">
                  Workload view <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              {loading ? (
                <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {["Agent", "Assigned", "Resolved Today", "Overdue", "Avg Response"].map((h) => (
                        <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {(data?.agentStats ?? []).map((agent) => (
                      <tr key={agent.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#0747A6] text-white flex items-center justify-center text-[10px] font-bold">
                              {agent.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">{agent.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-slate-700 dark:text-slate-300 font-semibold">{agent.assigned}</td>
                        <td className="py-2.5 px-2 text-emerald-600 font-semibold">{agent.resolvedToday}</td>
                        <td className="py-2.5 px-2">
                          <span className={`text-xs font-bold ${agent.overdue > 0 ? "text-red-600" : "text-slate-400"}`}>{agent.overdue}</span>
                        </td>
                        <td className="py-2.5 px-2 text-slate-500 text-xs">{agent.avgResponseHrs}h</td>
                      </tr>
                    ))}
                    {(data?.agentStats ?? []).length === 0 && (
                      <tr><td colSpan={5} className="py-6 text-center text-sm text-slate-400">No agents found</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Escalation + AI alerts */}
            <div className="space-y-4">
              {/* Escalation alerts */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Escalation Alerts</h3>
                  <button onClick={() => router.push("/lead/escalations")}
                    className="text-xs text-[#0052CC] hover:underline flex items-center gap-0.5">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
                {loading ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}</div>
                ) : (data?.recentEscalations ?? []).length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">No active escalations</div>
                ) : (
                  <div className="space-y-2">
                    {(data?.recentEscalations ?? []).slice(0, 3).map((esc) => (
                      <button key={esc.id} onClick={() => router.push(`/tickets/${esc.ticketKey ?? esc.id}`)}
                        className="w-full text-left p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full bg-${PRIORITY_COLORS[esc.priority] ? "red" : "amber"}-500`} />
                          <span className="text-[10px] font-mono text-slate-500">{esc.ticketKey ?? esc.id.slice(0, 8)}</span>
                          <span className="text-[10px] text-slate-400 ml-auto">{esc.client.name}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{esc.title}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* AI routing summary */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200">AI Routing</h3>
                </div>
                {loading ? (
                  <div className="h-12 bg-blue-100 dark:bg-blue-900/30 rounded animate-pulse" />
                ) : (
                  <>
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      AI routed <span className="font-bold text-blue-900 dark:text-blue-200">{data?.aiStats.routedToday ?? 0}</span> issues today
                    </p>
                    {(data?.aiStats.needsReview ?? 0) > 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                        <span className="font-bold">{data?.aiStats.needsReview}</span> need{(data?.aiStats.needsReview ?? 0) === 1 ? "s" : ""} manual review
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Issue heatmap bar chart by customer + priority */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Open Issues by Customer & Priority</h3>
            {loading ? (
              <div className="h-52 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            ) : (data?.chartData ?? []).length === 0 ? (
              <div className="h-32 flex items-center justify-center text-sm text-slate-400">No open issues</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.chartData ?? []} margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {Object.keys(PRIORITY_BAR_COLOR).map((p) => (
                    <Bar key={p} dataKey={p} stackId="a" fill={PRIORITY_BAR_COLOR[p]} name={p.charAt(0) + p.slice(1).toLowerCase()} />
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
