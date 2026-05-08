"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, Clock, CheckCircle, ShieldAlert, RefreshCw, ArrowUpRight, ChevronRight,
  Bot, Zap, Timer, TrendingUp,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { useSession } from "next-auth/react";

interface IssueItem {
  id: string;
  ticketKey: string | null;
  title: string;
  status: string;
  priority: string;
  slaBreached: boolean;
  slaBreachRisk?: boolean;
  slaDueAt: string | null;
  updatedAt: string;
  client: { name: string };
}

interface AiInsight {
  id: string;
  ticketKey: string | null;
  title: string;
  waitHours: number;
  priority: string;
  client: { name: string };
}

interface AgentStats {
  kpis: { assigned: number; overdue: number; resolvedToday: number; slaBreaches: number; pendingResponse: number; avgResponseHrs: number };
  recentIssues: IssueItem[];
  priorityQueue: IssueItem[];
  upcomingBreaches: IssueItem[];
  aiInsights: AiInsight[];
}

const STATUS_MAP: Record<string, string> = {
  OPEN:         "bg-red-50 text-red-700 ring-1 ring-red-200",
  ACKNOWLEDGED: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  IN_PROGRESS:  "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  RESOLVED:     "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  CLOSED:       "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
};

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500", HIGH: "bg-amber-500", MEDIUM: "bg-blue-400", LOW: "bg-slate-300",
};

const PRIORITY_BORDER: Record<string, string> = {
  CRITICAL: "border-l-red-500", HIGH: "border-l-amber-400", MEDIUM: "border-l-blue-400", LOW: "border-l-slate-200",
};

function SlaChip({ slaDueAt, slaBreached }: { slaDueAt: string | null; slaBreached: boolean }) {
  if (!slaDueAt) return <span className="text-xs text-slate-300">—</span>;
  const diff = new Date(slaDueAt).getTime() - Date.now();
  if (slaBreached || diff < 0) {
    const over = Math.abs(diff);
    const h = Math.floor(over / 3600000);
    const m = Math.floor((over % 3600000) / 60000);
    return <span className="text-[11px] font-semibold text-red-600">Overdue {h > 0 ? `${h}h ` : ''}{m}m</span>;
  }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h < 2) return <span className="text-[11px] font-semibold text-amber-600">{h}h {m}m left</span>;
  return <span className="text-[11px] text-slate-400">{h > 24 ? `${Math.floor(h / 24)}d` : `${h}h`} left</span>;
}

export default function AgentDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'queue' | 'recent'>('queue');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent/stats");
      if (res.ok) setData(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const firstName = session?.user?.name?.split(" ")[0] ?? null;

  const kpiCards = data ? [
    { label: "Assigned to Me",  value: data.kpis.assigned,      icon: AlertCircle,  accent: "border-l-slate-400",   iconCls: "bg-slate-100 text-slate-500",         route: "/tickets" },
    { label: "Overdue",         value: data.kpis.overdue,       icon: ShieldAlert,  accent: "border-l-red-500",     iconCls: "bg-red-50 text-red-500",              route: "/tickets?sla=overdue" },
    { label: "Resolved Today",  value: data.kpis.resolvedToday, icon: CheckCircle,  accent: "border-l-emerald-400", iconCls: "bg-emerald-50 text-emerald-600",      route: null },
    { label: "Avg Response",    value: data.kpis.avgResponseHrs > 0 ? `${data.kpis.avgResponseHrs}h` : "—",
                                                                 icon: TrendingUp,   accent: "border-l-blue-400",    iconCls: "bg-blue-50 text-blue-500",            route: null },
  ] : [];

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F8F9FB] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {firstName ? `Hi, ${firstName}` : "My Dashboard"}
            </span>
          }
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
                <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-12" />
              </div>
            )) : kpiCards.map(({ label, value, icon: Icon, accent, iconCls, route }) => (
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
              </button>
            ))}
          </div>

          {/* Overdue alert banner */}
          {!loading && (data?.kpis.overdue ?? 0) > 0 && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl px-4 py-3 flex items-center gap-3">
              <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm font-medium text-red-800 dark:text-red-300 flex-1">
                <span className="font-semibold">{data?.kpis.overdue} issue{(data?.kpis.overdue ?? 0) > 1 ? "s" : ""}</span> overdue — respond immediately to avoid further SLA breaches.
              </p>
              <button onClick={() => router.push("/tickets?sla=overdue")} className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold flex-shrink-0 flex items-center gap-0.5">
                View <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-5">

            {/* Left: Priority Queue + Recent */}
            <div className="col-span-2 space-y-4">

              {/* AI Insight Cards */}
              {!loading && (data?.aiInsights ?? []).length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-violet-200 dark:border-violet-800/50 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 rounded-md bg-violet-50 dark:bg-violet-950/40">
                      <Bot className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI Insights</h3>
                    <span className="text-[10px] bg-violet-50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 px-2 py-0.5 rounded-full font-semibold border border-violet-100 dark:border-violet-800">Auto-detected</span>
                  </div>
                  <div className="space-y-2">
                    {data!.aiInsights.map((ins) => (
                      <div key={ins.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2.5 border border-slate-100 dark:border-slate-700">
                        <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            <span className="font-mono text-[11px] text-violet-600 dark:text-violet-400 font-semibold">{ins.ticketKey ?? ins.id.slice(0, 8)}</span>
                            {" "}waiting <span className="font-semibold text-amber-600 dark:text-amber-400">{ins.waitHours}h</span> — AI response ready
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{ins.title} · {ins.client.name}</p>
                        </div>
                        <button
                          onClick={() => router.push(`/tickets/${ins.ticketKey ?? ins.id}`)}
                          className="text-xs text-[#0052CC] dark:text-blue-400 hover:underline font-semibold flex-shrink-0 flex items-center gap-0.5">
                          View <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issue list with toggle */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    {(['queue', 'recent'] as const).map((v) => (
                      <button key={v} onClick={() => setActiveView(v)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${activeView === v ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        {v === 'queue' ? 'Priority Queue' : 'Recent Activity'}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => router.push("/tickets")} className="flex items-center gap-0.5 text-xs text-[#0052CC] dark:text-blue-400 hover:underline font-medium">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="p-2">
                  {loading ? (
                    <div className="space-y-2 p-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
                  ) : (() => {
                    const items = activeView === 'queue' ? (data?.priorityQueue ?? []) : (data?.recentIssues ?? []);
                    if (items.length === 0) return (
                      <div className="py-10 text-center">
                        <CheckCircle className="w-9 h-9 mx-auto mb-2.5 text-emerald-300 dark:text-emerald-700" />
                        <p className="text-sm text-slate-400">No active issues — great work!</p>
                      </div>
                    );
                    return (
                      <div className="space-y-1">
                        {items.map((issue) => {
                          const isOverdue = issue.slaDueAt && new Date(issue.slaDueAt) < new Date();
                          return (
                            <button key={issue.id} onClick={() => router.push(`/tickets/${issue.ticketKey ?? issue.id}`)}
                              className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-[3px] ${PRIORITY_BORDER[issue.priority] ?? 'border-l-slate-200'} border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[issue.priority]}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-[11px] font-mono font-semibold text-[#0052CC] dark:text-blue-400">{issue.ticketKey ?? issue.id.slice(0, 8)}</span>
                                  <span className="text-[11px] text-slate-400">{issue.client.name}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_MAP[issue.status] ?? STATUS_MAP.CLOSED}`}>{issue.status.replace("_", " ")}</span>
                                </div>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-[#0052CC] transition-colors">{issue.title}</p>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <SlaChip slaDueAt={issue.slaDueAt} slaBreached={issue.slaBreached} />
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">

              {/* Upcoming SLA Breaches */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="px-4 pt-3.5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <div className="p-1 rounded-md bg-amber-50 dark:bg-amber-950/40">
                    <Timer className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Upcoming Breaches</h3>
                  <span className="text-[10px] text-slate-400 ml-auto">next 4h</span>
                </div>
                <div className="p-3">
                  {loading ? (
                    <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
                  ) : (data?.upcomingBreaches ?? []).length === 0 ? (
                    <div className="py-5 text-center">
                      <CheckCircle className="w-7 h-7 mx-auto mb-2 text-emerald-300 dark:text-emerald-700" />
                      <p className="text-xs text-slate-400">Clear for next 4 hours</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {data!.upcomingBreaches.map((issue) => {
                        const diffMs = new Date(issue.slaDueAt!).getTime() - Date.now();
                        const h = Math.floor(diffMs / 3600000);
                        const m = Math.floor((diffMs % 3600000) / 60000);
                        return (
                          <button key={issue.id} onClick={() => router.push(`/tickets/${issue.ticketKey ?? issue.id}`)}
                            className="w-full text-left p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-mono font-semibold text-[#0052CC] dark:text-blue-400">{issue.ticketKey ?? issue.id.slice(0, 8)}</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">{issue.title}</p>
                              </div>
                              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex-shrink-0">{h}h {m}m</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Today's Summary */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Today's Summary</h3>
                {loading ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}</div>
                ) : (
                  <div className="space-y-2.5">
                    {[
                      { label: "Pending Response", value: data?.kpis.pendingResponse ?? 0, cls: "text-amber-600 dark:text-amber-400" },
                      { label: "SLA Breaches",     value: data?.kpis.slaBreaches ?? 0,     cls: data?.kpis.slaBreaches ? "text-red-600 dark:text-red-400" : "text-slate-400" },
                      { label: "Resolved Today",   value: data?.kpis.resolvedToday ?? 0,   cls: "text-emerald-600 dark:text-emerald-400" },
                    ].map(({ label, value, cls }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                        <span className={`text-sm font-semibold tabular-nums ${cls}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick links */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Quick Links</h3>
                <div className="space-y-0.5">
                  {[
                    { label: "My Issue Queue",  href: "/tickets" },
                    { label: "Knowledge Base",  href: "/agent/kb" },
                    { label: "All Issues",      href: "/tickets?view=all" },
                  ].map(({ label, href }) => (
                    <button key={href} onClick={() => router.push(href)}
                      className="w-full text-left flex items-center justify-between px-2.5 py-2 rounded-md text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#0052CC] dark:hover:text-blue-400 transition-colors">
                      {label}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
