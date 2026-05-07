"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, CheckCircle, Clock, ArrowUpRight, RefreshCw,
  Plus, Activity, ShieldAlert, ShieldCheck, AlertTriangle,
  Users, BarChart3, Flame, Timer, TrendingUp,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { getSocket } from "@/lib/socket-client";

/* ── helpers ─────────────────────────────────────────── */
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusLozenge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    RESOLVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    ACKNOWLEDGED: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    CLOSED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${map[status] ?? map.CLOSED}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    CRITICAL: "bg-red-500", HIGH: "bg-orange-500", MEDIUM: "bg-yellow-400", LOW: "bg-blue-400",
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${map[priority?.toUpperCase()] ?? "bg-slate-400"}`} title={priority} />;
}

const CATEGORY_LABELS: Record<string, string> = {
  BUG: "Bug", FEATURE_REQUEST: "Feature Request", DATA_ACCURACY: "Data Accuracy",
  PERFORMANCE: "Performance", "ACCESS SECURITY": "Access / Security",
};
const CATEGORY_COLORS = ["#0052CC", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"];

/* ── main component ──────────────────────────────────── */
export default function ClientDashboard() {
  const { data: session } = useSession();
  const router = useRouter();

  const [kpiData, setKpiData] = useState<any>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [reportsData, setReportsData] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async () => {
    setRefreshing(true);
    await Promise.all([fetchKPI(), fetchTickets(), fetchReports(), fetchActivity(), fetchUsers()]);
    setRefreshing(false);
  };

  const fetchKPI = async () => {
    try {
      const res = await fetch("/api/dashboard/kpi");
      if (res.ok) { const d = await res.json(); setKpiData(d.metrics); }
    } catch {}
    finally { setKpiLoading(false); }
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/dashboard/tickets", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setTickets((d.tickets ?? []).sort((a: any, b: any) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ).slice(0, 8));
      }
    } catch {}
    finally { setTicketsLoading(false); }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/dashboard/reports");
      if (res.ok) setReportsData(await res.json());
    } catch {}
  };

  const fetchActivity = async () => {
    try {
      const res = await fetch("/api/dashboard/activity");
      if (res.ok) { const d = await res.json(); setActivity(d.activity ?? []); }
    } catch {}
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/dashboard/users");
      if (res.ok) { const d = await res.json(); setUsers(Array.isArray(d) ? d : []); }
    } catch {}
  };

  useEffect(() => { fetchAll(); }, []);

  // Real-time socket updates
  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit("join:tickets");
    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("ticket:updated", (updated: any) => {
      setTickets(prev =>
        prev.some((t: any) => t.id === updated.id)
          ? prev.map((t: any) => t.id === updated.id ? { ...t, ...updated } : t)
              .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          : prev
      );
    });
    return () => { socket.off("connect", join); socket.off("ticket:updated"); };
  }, []);

  /* ── derived data ──────────────────────────────────── */
  const openTickets = kpiData?.openTickets ?? 0;
  const criticalCount = kpiData?.criticalIssues ?? 0;
  const resolvedCount = kpiData?.resolvedTickets ?? 0;
  const slaCompliance = reportsData?.slaCompliance ?? 100;
  const avgResolutionDays = reportsData?.avgResolutionDays ?? 0;
  const slaBreached = kpiData?.slaBreachedCount ?? 0;
  const slaAtRisk = kpiData?.slaBreachRiskCount ?? 0;

  // Account health status
  const accountStatus: "critical" | "warning" | "healthy" =
    slaBreached > 0 || criticalCount >= 5 ? "critical" :
    slaAtRisk > 0 || criticalCount > 0 ? "warning" : "healthy";

  const healthConfig = {
    critical: { label: "Critical", bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-200 dark:border-red-800", icon: <ShieldAlert className="w-5 h-5 text-red-500" />, text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
    warning:  { label: "Needs Attention", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800", icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
    healthy:  { label: "Healthy", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800", icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />, text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  };
  const hc = healthConfig[accountStatus];

  // AI insights derived from data
  const aiInsights: string[] = [];
  if (slaBreached > 0) aiInsights.push(`${slaBreached} ticket${slaBreached > 1 ? "s have" : " has"} breached SLA — escalation recommended.`);
  if (slaAtRisk > 0) aiInsights.push(`${slaAtRisk} ticket${slaAtRisk > 1 ? "s are" : " is"} at risk of breaching SLA within 2h.`);
  if (criticalCount > 0 && slaBreached === 0) aiInsights.push(`${criticalCount} critical ticket${criticalCount > 1 ? "s" : ""} open — prioritise response.`);
  if (avgResolutionDays > 3) aiInsights.push(`Avg resolution time is ${avgResolutionDays}d — consider raising escalation earlier.`);
  if (aiInsights.length === 0) aiInsights.push("All tickets are within SLA. Resolution time is on track.");

  // Escalations = CRITICAL or SLA-breached open tickets
  const escalations = tickets.filter((t: any) =>
    t.priority === "CRITICAL" || t.slaBreached || t.priority === "HIGH"
  ).slice(0, 5);

  // Top categories
  const categories = (reportsData?.categoryBreakdown ?? []).filter((c: any) => c.count > 0).slice(0, 5);
  const catMax = Math.max(...categories.map((c: any) => c.count), 1);

  // Active users — derive ticket count from open tickets
  const userTicketMap: Record<string, { name: string; email: string; open: number }> = {};
  tickets.forEach((t: any) => {
    if (t.raisedBy?.id) {
      if (!userTicketMap[t.raisedBy.id]) userTicketMap[t.raisedBy.id] = { name: t.raisedBy.name, email: "", open: 0 };
      userTicketMap[t.raisedBy.id].open++;
    }
  });
  const activeUsers = Object.values(userTicketMap).sort((a, b) => b.open - a.open).slice(0, 6);

  const kpis = [
    { label: "Open Tickets", value: openTickets, icon: AlertCircle, color: "border-l-red-500", textColor: "text-red-600", route: "/tickets?status=OPEN" },
    { label: "Critical", value: criticalCount, icon: Flame, color: "border-l-red-600", textColor: "text-red-700", route: "/tickets?priority=CRITICAL" },
    { label: "Resolved", value: resolvedCount, icon: CheckCircle, color: "border-l-emerald-500", textColor: "text-emerald-600", route: "/tickets?status=RESOLVED" },
    { label: "SLA Compliance", value: `${slaCompliance}%`, icon: ShieldCheck, color: "border-l-blue-500", textColor: "text-blue-600", route: null },
    { label: "Avg Resolution", value: avgResolutionDays > 0 ? `${avgResolutionDays}d` : "—", icon: Timer, color: "border-l-purple-500", textColor: "text-purple-600", route: null },
  ];

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {session?.user?.name ? `Welcome, ${session.user.name.split(" ")[0]}` : "My Dashboard"}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Client Overview</p>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/create-ticket")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#0052CC] hover:bg-[#0747A6] text-white rounded-md transition-colors font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> New Ticket
              </button>
              <button
                onClick={fetchAll}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {kpiLoading ? [...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-slate-200 p-5 animate-pulse">
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-24 mb-3" />
                <div className="h-7 bg-slate-100 dark:bg-slate-800 rounded w-12" />
              </div>
            )) : kpis.map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div key={i}
                  onClick={() => kpi.route && router.push(kpi.route)}
                  className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 ${kpi.color} p-5 ${kpi.route ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{kpi.label}</p>
                    <Icon className={`w-4 h-4 ${kpi.textColor} opacity-60`} />
                  </div>
                  <p className={`text-2xl font-bold tabular-nums ${kpi.textColor}`}>{kpi.value}</p>
                </div>
              );
            })}
          </div>

          {/* Account Health */}
          {!kpiLoading && (
            <div className={`rounded-xl border ${hc.border} ${hc.bg} px-5 py-4 flex items-start gap-4`}>
              <div className="flex-shrink-0 mt-0.5">{hc.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-bold ${hc.text}`}>Account Health: {hc.label}</span>
                  <span className={`w-2 h-2 rounded-full ${hc.dot} animate-pulse`} />
                </div>
                <div className="space-y-0.5">
                  {aiInsights.map((insight, i) => (
                    <p key={i} className={`text-xs ${hc.text} opacity-90`}>· {insight}</p>
                  ))}
                </div>
              </div>
              {(slaBreached > 0 || slaAtRisk > 0) && (
                <button
                  onClick={() => router.push("/tickets?status=OPEN")}
                  className={`flex-shrink-0 text-xs font-medium ${hc.text} hover:underline flex items-center gap-1`}
                >
                  View tickets <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Row 1 — Open Issues (2/3) | Top Active Users (1/3) */}
          <div className="grid grid-cols-3 gap-5">
            {/* Open Issues Table */}
            <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Open Issues</h2>
                <button onClick={() => router.push("/tickets")}
                  className="flex items-center gap-1 text-xs text-[#0052CC] hover:underline">
                  View all <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              {ticketsLoading ? (
                <div className="p-5 space-y-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-10 animate-pulse bg-slate-100 dark:bg-slate-800 rounded" />)}
                </div>
              ) : tickets.filter((t: any) => t.status === "OPEN" || t.status === "IN_PROGRESS").length === 0 ? (
                <div className="p-10 text-center">
                  <CheckCircle className="w-8 h-8 mx-auto mb-3 text-emerald-400 opacity-50" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">No open tickets — great!</p>
                  <button onClick={() => router.push("/create-ticket")}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs bg-[#0052CC] hover:bg-[#0747A6] text-white rounded-lg mx-auto font-medium">
                    <Plus className="w-3.5 h-3.5" /> Create a ticket
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        {["Key", "Summary", "P", "Status", "Updated"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {tickets.filter((t: any) => t.status === "OPEN" || t.status === "IN_PROGRESS").map(ticket => (
                        <tr key={ticket.id}
                          onClick={() => router.push(`/tickets/${ticket.ticketKey ?? ticket.id}`)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-bold text-[#0052CC] dark:text-blue-400 whitespace-nowrap">
                              {ticket.ticketKey ?? ticket.id}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[240px]">
                            <span className="text-slate-800 dark:text-slate-200 truncate block text-xs">{ticket.title}</span>
                          </td>
                          <td className="px-4 py-3"><PriorityDot priority={ticket.priority} /></td>
                          <td className="px-4 py-3"><StatusLozenge status={ticket.status} /></td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {new Date(ticket.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Active Users */}
            <div className="col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Active Users</h2>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              {activeUsers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No user data</p>
              ) : (
                <div className="space-y-3">
                  {activeUsers.map((u, i) => {
                    const initials = (u.name ?? "?").split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
                    const maxOpen = Math.max(...activeUsers.map(a => a.open), 1);
                    const pct = Math.round((u.open / maxOpen) * 100);
                    return (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#0747A6] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{u.name}</span>
                            <span className="text-xs tabular-nums text-slate-500 ml-2">{u.open} open</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#0052CC]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* All team members */}
              {users.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">All Members ({users.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {users.slice(0, 8).map((u: any) => (
                      <div key={u.id} title={u.name}
                        className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center">
                        {(u.name ?? "?").split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                    ))}
                    {users.length > 8 && (
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 text-[10px] font-bold flex items-center justify-center">
                        +{users.length - 8}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 2 — Top Categories (1/3) | Activity Feed (1/3) | Escalations (1/3) */}
          <div className="grid grid-cols-3 gap-5">

            {/* Top Impact Areas */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Top Impact Areas</h2>
                <BarChart3 className="w-4 h-4 text-slate-400" />
              </div>
              {!reportsData ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-1 animate-pulse">
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-28" />
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                    </div>
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No data</p>
              ) : (
                <div className="space-y-3">
                  {categories.map((cat: any, idx: number) => {
                    const pct = Math.round((cat.count / catMax) * 100);
                    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                    const label = CATEGORY_LABELS[cat.category.toUpperCase()] ?? cat.category;
                    return (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
                          <span className="text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">{cat.count}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <button onClick={() => router.push("/tickets")}
                className="mt-4 flex items-center gap-1 text-xs text-[#0052CC] hover:underline">
                View by category <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col">
              <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recent Activity</h2>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800" style={{ maxHeight: 320 }}>
                {activity.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-xs text-slate-400">No recent activity</p>
                  </div>
                ) : (
                  activity.slice(0, 10).map((item: any) => (
                    <div key={item.id}
                      onClick={() => item.issue && router.push(`/tickets/${item.issue.ticketKey ?? item.issue.id}`)}
                      className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                      <div className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0052CC] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                            <span className="font-semibold">{item.changedBy?.name ?? "System"}</span>
                            {" changed "}<span className="font-medium">{item.fieldChanged}</span>
                            {item.newValue && <span className="text-slate-500"> → <span className="text-[#0052CC] dark:text-blue-400 font-medium">{item.newValue}</span></span>}
                          </p>
                          {item.issue && (
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                              {item.issue.ticketKey} · {item.issue.title}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(item.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Current Blockers / Escalations */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col">
              <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-red-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Blockers & Escalations</h2>
              </div>
              <div className="flex-1 px-3 py-3 space-y-2" style={{ maxHeight: 320, overflowY: "auto" }}>
                {ticketsLoading ? (
                  [...Array(3)].map((_, i) => <div key={i} className="h-12 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg" />)
                ) : escalations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <TrendingUp className="w-6 h-6 text-emerald-400 mb-2" />
                    <p className="text-xs text-slate-400">No blockers — things are on track</p>
                  </div>
                ) : (
                  escalations.map(ticket => (
                    <button key={ticket.id}
                      onClick={() => router.push(`/tickets/${ticket.ticketKey ?? ticket.id}`)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left">
                      <PriorityDot priority={ticket.priority} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{ticket.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-400">{ticket.ticketKey}</span>
                          {ticket.slaBreached && (
                            <span className="text-[10px] bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1 rounded font-semibold">SLA</span>
                          )}
                          <StatusLozenge status={ticket.status} />
                        </div>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    </button>
                  ))
                )}
              </div>
              {escalations.length > 0 && (
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={() => router.push("/tickets?priority=CRITICAL")}
                    className="text-xs text-[#0052CC] hover:underline flex items-center gap-1">
                    View all critical <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

          </div>{/* end row 2 */}

        </main>
      </div>
    </div>
  );
}
