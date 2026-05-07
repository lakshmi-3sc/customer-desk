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

interface AiInsight { id: string; ticketKey: string | null; title: string; waitHours: number; priority: string; client: { name: string } }

interface AgentStats {
  kpis: { assigned: number; overdue: number; resolvedToday: number; slaBreaches: number; pendingResponse: number; avgResponseHrs: number };
  recentIssues: IssueItem[];
  priorityQueue: IssueItem[];
  upcomingBreaches: IssueItem[];
  aiInsights: AiInsight[];
}

const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  ACKNOWLEDGED: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  RESOLVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  CLOSED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500", HIGH: "bg-amber-500", MEDIUM: "bg-blue-500", LOW: "bg-slate-400",
};

const PRIORITY_RING: Record<string, string> = {
  CRITICAL: "border-l-red-500", HIGH: "border-l-amber-500", MEDIUM: "border-l-blue-400", LOW: "border-l-slate-300",
};

function SlaChip({ slaDueAt, slaBreached }: { slaDueAt: string | null; slaBreached: boolean }) {
  if (!slaDueAt) return <span className="text-xs text-slate-400">—</span>;
  const now = Date.now();
  const due = new Date(slaDueAt).getTime();
  const diff = due - now;
  if (slaBreached || diff < 0) {
    const over = Math.abs(diff);
    const h = Math.floor(over / 3600000);
    const m = Math.floor((over % 3600000) / 60000);
    return <span className="text-xs font-semibold text-red-600 dark:text-red-400">Overdue {h > 0 ? `${h}h ` : ''}{m}m</span>;
  }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h < 2) return <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{h}h {m}m left</span>;
  return <span className="text-xs text-slate-500 dark:text-slate-400">{h > 24 ? `${Math.floor(h / 24)}d` : `${h}h`} left</span>;
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

  const now = new Date();

  const kpiCards = data ? [
    { label: "My Assigned", value: data.kpis.assigned, icon: AlertCircle, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-l-blue-500", route: "/tickets" },
    { label: "Overdue", value: data.kpis.overdue, icon: ShieldAlert, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", border: "border-l-red-500", route: "/tickets?sla=overdue" },
    { label: "Resolved Today", value: data.kpis.resolvedToday, icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-l-emerald-500", route: null },
    { label: "Avg Response", value: data.kpis.avgResponseHrs > 0 ? `${data.kpis.avgResponseHrs}h` : "—", icon: TrendingUp, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-l-purple-500", route: null },
  ] : [];

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {session?.user?.name ? `👋 Hi, ${session.user.name.split(" ")[0]}` : "My Dashboard"}
              </span>
            </div>
          }
          right={
            <button onClick={load} className="p-1.5 rounded-md text-slate-500 hover:text-[#0052CC] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            {loading ? [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border-l-4 border-l-slate-200 dark:border-l-slate-700 border border-slate-200 dark:border-slate-800 p-4 animate-pulse">
                <div className="flex items-start justify-between mb-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24" />
                  <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded w-14" />
              </div>
            )) : kpiCards.map(({ label, value, icon: Icon, color, bg, border, route }) => (
              <button key={label} onClick={() => route && router.push(route)} disabled={!route}
                className={`${bg} p-4 rounded-xl border-l-4 ${border} border border-slate-200/50 dark:border-slate-800/50 text-left ${route ? "cursor-pointer hover:shadow-sm" : "cursor-default"} transition-shadow`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
              </button>
            ))}
          </div>

          {/* Overdue alert banner */}
          {!loading && (data?.kpis.overdue ?? 0) > 0 && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-3.5 flex items-center gap-3">
              <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-red-800 dark:text-red-300 flex-1">
                {data?.kpis.overdue} issue{(data?.kpis.overdue ?? 0) > 1 ? "s are" : " is"} overdue — respond immediately to avoid further SLA breaches.
              </p>
              <button onClick={() => router.push("/tickets?sla=overdue")} className="text-xs text-red-700 dark:text-red-400 hover:underline font-semibold flex-shrink-0">View →</button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-5">

            {/* Left: Priority Queue + Recent */}
            <div className="col-span-2 space-y-4">

              {/* AI Insight Cards */}
              {!loading && (data?.aiInsights ?? []).length > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/20 rounded-xl border border-purple-200 dark:border-purple-800/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm font-bold text-purple-900 dark:text-purple-300">AI Insights</h3>
                    <span className="text-[10px] bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold">Auto-detected</span>
                  </div>
                  <div className="space-y-2">
                    {data!.aiInsights.map((ins) => (
                      <div key={ins.id} className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-lg px-3 py-2.5 border border-purple-100 dark:border-purple-900/50">
                        <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            <span className="font-mono text-purple-700 dark:text-purple-400">{ins.ticketKey ?? ins.id.slice(0, 8)}</span>
                            {" "}has been waiting <span className="font-semibold text-amber-700 dark:text-amber-400">{ins.waitHours}h</span> — suggested response available
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{ins.title} · {ins.client.name}</p>
                        </div>
                        <button
                          onClick={() => router.push(`/tickets/${ins.ticketKey ?? ins.id}`)}
                          className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-semibold flex-shrink-0">
                          View →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issue list with toggle */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    {(['queue', 'recent'] as const).map((v) => (
                      <button key={v} onClick={() => setActiveView(v)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${activeView === v ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        {v === 'queue' ? 'Priority Queue' : 'Recent Activity'}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => router.push("/tickets")} className="flex items-center gap-1 text-xs text-[#0052CC] hover:underline">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="p-2">
                  {loading ? (
                    <div className="space-y-2 p-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}</div>
                  ) : (() => {
                    const items = activeView === 'queue' ? (data?.priorityQueue ?? []) : (data?.recentIssues ?? []);
                    if (items.length === 0) return (
                      <div className="py-10 text-center">
                        <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
                        <p className="text-sm text-slate-500">No active issues — great work!</p>
                      </div>
                    );
                    return (
                      <div className="space-y-1">
                        {items.map((issue) => {
                          const isOverdue = issue.slaDueAt && new Date(issue.slaDueAt) < now;
                          return (
                            <button key={issue.id} onClick={() => router.push(`/tickets/${issue.ticketKey ?? issue.id}`)}
                              className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg border-l-4 ${PRIORITY_RING[issue.priority] ?? 'border-l-slate-200'} bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800 transition-colors group`}>
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[issue.priority]}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-[10px] font-mono font-bold text-[#0052CC] dark:text-blue-400">{issue.ticketKey ?? issue.id.slice(0, 8)}</span>
                                  <span className="text-[10px] text-slate-400">{issue.client.name}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${STATUS_COLOR[issue.status]}`}>{issue.status.replace("_", " ")}</span>
                                </div>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-[#0052CC] transition-colors">{issue.title}</p>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <SlaChip slaDueAt={issue.slaDueAt} slaBreached={issue.slaBreached} />
                                {isOverdue && <div className="flex justify-end mt-0.5"><ShieldAlert className="w-3 h-3 text-red-500" /></div>}
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
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Timer className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Upcoming SLA Breaches</h3>
                  <span className="text-[10px] text-slate-400 ml-auto">next 4h</span>
                </div>
                <div className="p-3">
                  {loading ? (
                    <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}</div>
                  ) : (data?.upcomingBreaches ?? []).length === 0 ? (
                    <div className="py-5 text-center">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                      <p className="text-xs text-slate-500">No breaches in next 4 hours</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data!.upcomingBreaches.map((issue) => {
                        const due = new Date(issue.slaDueAt!);
                        const diffMs = due.getTime() - Date.now();
                        const h = Math.floor(diffMs / 3600000);
                        const m = Math.floor((diffMs % 3600000) / 60000);
                        return (
                          <button key={issue.id} onClick={() => router.push(`/tickets/${issue.ticketKey ?? issue.id}`)}
                            className="w-full text-left p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-mono font-bold text-[#0052CC] dark:text-blue-400">{issue.ticketKey ?? issue.id.slice(0, 8)}</p>
                                <p className="text-xs text-slate-700 dark:text-slate-300 truncate mt-0.5">{issue.title}</p>
                              </div>
                              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex-shrink-0">{h}h {m}m</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick stats summary */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Today's Summary</h3>
                {loading ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}</div>
                ) : (
                  <div className="space-y-2.5">
                    {[
                      { label: "Pending Response", value: data?.kpis.pendingResponse ?? 0, color: "text-amber-600 dark:text-amber-400" },
                      { label: "SLA Breaches", value: data?.kpis.slaBreaches ?? 0, color: "text-red-600 dark:text-red-400" },
                      { label: "Resolved Today", value: data?.kpis.resolvedToday ?? 0, color: "text-emerald-600 dark:text-emerald-400" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
                        <span className={`text-sm font-bold ${color}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick links */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Quick Links</h3>
                <div className="space-y-1.5">
                  {[
                    { label: "My Issue Queue", href: "/tickets" },
                    { label: "Create Ticket", href: "/create-ticket" },
                    { label: "Knowledge Base", href: "/agent/kb" },
                    { label: "All Issues", href: "/tickets?view=all" },
                  ].map(({ label, href }) => (
                    <button key={href} onClick={() => router.push(href)}
                      className="w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#0052CC] dark:hover:text-blue-400 transition-colors">
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

