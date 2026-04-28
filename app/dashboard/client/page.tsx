"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Ticket,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Zap,
  TrendingUp,
  ShieldAlert,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { getSocket } from "@/lib/socket-client";

function getApiBasedMetrics(kpiData: any) {
  return [
    {
      label: "Open Tickets",
      value: kpiData.openTickets ?? 0,
      delta: null,
      color: "text-red-600 dark:text-red-400",
      border: "border-l-red-500",
      icon: AlertCircle,
      route: "/tickets?status=OPEN",
    },
    {
      label: "In Progress",
      value: kpiData.inProgressTickets ?? 0,
      delta: `${Math.round(kpiData.avgResolutionTime ?? 0)}d avg`,
      color: "text-amber-600 dark:text-amber-400",
      border: "border-l-amber-500",
      icon: Clock,
      route: "/tickets?status=IN_PROGRESS",
    },
    {
      label: "Resolved",
      value: kpiData.resolvedTickets ?? 0,
      delta: null,
      color: "text-emerald-600 dark:text-emerald-400",
      border: "border-l-emerald-500",
      icon: CheckCircle,
      route: "/tickets?status=RESOLVED",
    },
    {
      label: "Support Score",
      value: `${kpiData.teamEfficiencyScore ?? 0}%`,
      delta: "efficiency",
      color: "text-[#0052CC] dark:text-blue-400",
      border: "border-l-[#0052CC]",
      icon: Ticket,
      route: null,
    },
  ];
}

function generateTicketKey(project: { name: string } | null, ticketId: string): string {
  if (!project) return `TKT-${ticketId.slice(0, 8).toUpperCase()}`;
  const projectKey = project.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
  const hash = ticketId
    .split("")
    .reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0);
  return `${projectKey}-${Math.abs(hash % 9999) + 1000}`;
}

function StatusLozenge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    RESOLVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    ACKNOWLEDGED: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    CLOSED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
  const cls = map[status] ?? map.CLOSED;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    CRITICAL: "bg-red-500",
    HIGH: "bg-orange-500",
    MEDIUM: "bg-yellow-400",
    LOW: "bg-blue-400",
  };
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${map[priority?.toUpperCase()] ?? "bg-slate-400"}`}
      title={priority}
    />
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#3b82f6",
};

export default function ClientDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [kpiData, setKpiData] = useState<any>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [reportsData, setReportsData] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);

  const fetchActivity = async () => {
    try {
      const res = await fetch("/api/dashboard/activity");
      if (res.ok) {
        const data = await res.json();
        setActivity(data.activity ?? []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/dashboard/reports");
      if (res.ok) setReportsData(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchKPI = async () => {
    try {
      const res = await fetch("/api/dashboard/kpi");
      if (res.ok) {
        const data = await res.json();
        setKpiData(data.metrics);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setKpiLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/dashboard/tickets?status=OPEN", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const sorted = (data.tickets ?? [])
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5);
        setTickets(sorted);
        setLastRefresh(new Date());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    fetchKPI();
    fetchTickets();
    fetchReports();
    fetchActivity();
  }, []);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const socket = getSocket();

    const joinRoom = () => socket.emit('join:tickets');
    if (socket.connected) joinRoom();
    socket.on('connect', joinRoom);

    socket.on('ticket:updated', (updated: any) => {
      setTickets((prev) =>
        prev.some((t: any) => t.id === updated.id)
          ? prev
              .map((t: any) => (t.id === updated.id ? { ...t, ...updated } : t))
              .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          : prev
      );
    });
    return () => {
      socket.off('connect', joinRoom);
      socket.off('ticket:updated');
    };
  }, []);

  const metrics = kpiData ? getApiBasedMetrics(kpiData) : null;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <TopBar
          left={
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">My Overview</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {session?.user?.name ? `Hello, ${session.user.name.split(" ")[0]}` : "Client Dashboard"}
              </p>
            </div>
          }
          right={
            <button
              onClick={() => { fetchKPI(); fetchTickets(); fetchReports(); fetchActivity(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          }
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* AI Insight Banner */}
            {!kpiLoading && kpiData && (kpiData.slaBreachRiskCount > 0 || kpiData.slaBreachedCount > 0) && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40">
                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    AI Insight
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    {kpiData.slaBreachRiskCount > 0 && (
                      <span>{kpiData.slaBreachRiskCount} issue{kpiData.slaBreachRiskCount !== 1 ? "s are" : " is"} at risk of breaching SLA. </span>
                    )}
                    {kpiData.slaBreachedCount > 0 && (
                      <span>{kpiData.slaBreachedCount} issue{kpiData.slaBreachedCount !== 1 ? "s have" : " has"} already breached SLA. </span>
                    )}
                    Consider escalating critical tickets to avoid further delays.
                  </p>
                </div>
                <button
                  onClick={() => router.push("/tickets?status=OPEN")}
                  className="flex-shrink-0 text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 flex items-center gap-1"
                >
                  View <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 border-l-4 border-l-slate-200 dark:border-l-slate-700 p-4 animate-pulse">
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-3" />
                      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                    </div>
                  ))
                : metrics?.map((m, i) => {
                    const Icon = m.icon;
                    return (
                      <div
                        key={i}
                        onClick={() => m.route && router.push(m.route)}
                        className={`bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 border-l-4 ${m.border} p-4 ${m.route ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            {m.label}
                          </p>
                          <Icon className={`w-4 h-4 ${m.color} opacity-60`} />
                        </div>
                        <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
                        {m.delta && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.delta}</p>
                        )}
                      </div>
                    );
                  })}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Trend chart */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Issue Trend</h2>
                  <span className="text-xs text-slate-400">Last 8 weeks</span>
                </div>
                {!reportsData ? (
                  <div className="h-44 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height={176}>
                    <AreaChart data={reportsData.weeklyVolume}>
                      <defs>
                        <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0052CC" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#0052CC" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#36B37E" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#36B37E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: "6px", color: "#f8fafc", fontSize: "12px" }} />
                      <Area type="monotone" dataKey="created" name="Created" stroke="#0052CC" strokeWidth={2} fill="url(#createdGrad)" dot={false} />
                      <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#36B37E" strokeWidth={2} fill="url(#resolvedGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Priority donut */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">By Priority</h2>
                {!reportsData ? (
                  <div className="h-44 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie
                          data={reportsData.priorityBreakdown.filter((p: any) => p.count > 0)}
                          cx="50%" cy="50%"
                          innerRadius={36} outerRadius={55}
                          paddingAngle={3}
                          dataKey="count" nameKey="priority"
                        >
                          {reportsData.priorityBreakdown.map((entry: any) => (
                            <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] ?? "#94a3b8"} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: "6px", color: "#f8fafc", fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 space-y-1">
                      {reportsData.priorityBreakdown
                        .filter((p: any) => p.count > 0)
                        .map((p: any) => (
                          <div key={p.priority} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLORS[p.priority] ?? "#94a3b8" }} />
                            <span className="text-xs text-slate-500 dark:text-slate-400 capitalize flex-1">{p.priority.toLowerCase()}</span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{p.count}</span>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Open Tickets Table */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    My Open Tickets
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/tickets")}
                    className="text-xs text-[#0052CC] dark:text-blue-400 hover:text-[#0747A6] h-7 px-2"
                  >
                    View all
                    <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>

                {ticketsLoading ? (
                  <div className="p-5 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                    ))}
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="p-10 text-center">
                    <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-400 opacity-50" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">No open tickets — great!</p>
                    <Button
                      size="sm"
                      onClick={() => router.push("/create-ticket")}
                      className="bg-[#0052CC] hover:bg-[#0747A6] text-white"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Create a ticket
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Key</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Summary</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">P</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {tickets.map((ticket) => (
                          <tr
                            key={ticket.id}
                            onClick={() => router.push(`/tickets/${ticket.ticketKey ?? ticket.id}`)}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                          >
                            <td className="px-5 py-3">
                              <span className="font-mono text-xs font-bold text-[#0052CC] dark:text-blue-400 whitespace-nowrap">
                                {ticket.ticketKey ?? ticket.id}
                              </span>
                            </td>
                            <td className="px-3 py-3 max-w-[240px]">
                              <span className="text-slate-800 dark:text-slate-200 truncate block text-sm">
                                {ticket.title}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <PriorityDot priority={ticket.priority} />
                            </td>
                            <td className="px-3 py-3">
                              <StatusLozenge status={ticket.status} />
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {new Date(ticket.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Recent Activity Feed */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-[#0052CC]" />
                    Recent Activity
                  </h2>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {activity.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <p className="text-xs text-slate-400">No recent activity</p>
                    </div>
                  ) : (
                    activity.slice(0, 8).map((item: any) => (
                      <div
                        key={item.id}
                        className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        onClick={() => item.issue && router.push(`/tickets/${item.issue.ticketKey ?? item.issue.id}`)}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-[#0052CC]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Activity className="w-2.5 h-2.5 text-[#0052CC]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              <span className="font-medium">{item.changedBy?.name ?? 'System'}</span>
                              {' changed '}
                              <span className="font-medium">{item.fieldChanged}</span>
                              {item.oldValue && item.newValue && (
                                <span className="text-slate-500 dark:text-slate-400">
                                  {' from '}<span className="line-through">{item.oldValue}</span>
                                  {' to '}<span className="font-medium text-[#0052CC] dark:text-blue-400">{item.newValue}</span>
                                </span>
                              )}
                            </p>
                            {item.issue && (
                              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                {item.issue.ticketKey ?? item.issue.id} · {item.issue.title}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(item.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
