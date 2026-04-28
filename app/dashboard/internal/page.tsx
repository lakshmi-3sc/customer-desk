"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  Zap,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { getSocket } from "@/lib/socket-client";

const mockAiInsights = [
  {
    id: 1,
    title: "5 tickets pending customer response — auto-reminder sent",
    type: "suggestion",
    icon: Zap,
  },
  {
    id: 2,
    title: "3 SLA breaches detected. Escalation protocols activated",
    type: "critical",
    icon: AlertCircle,
  },
  {
    id: 3,
    title: "Predicted team capacity: 95 new tickets can be assigned today",
    type: "info",
    icon: TrendingUp,
  },
];

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
      label: "SLA Breaches",
      value: kpiData.slaBreachedCount ?? 0,
      delta: `${kpiData.slaBreachRiskCount ?? 0} at risk`,
      color: "text-red-600 dark:text-red-400",
      border: "border-l-red-500",
      icon: AlertTriangle,
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
    OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
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

export default function InternalDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [kpiData, setKpiData] = useState<any>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

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
      const res = await fetch("/api/dashboard/tickets", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const sorted = (data.tickets ?? [])
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 8);
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
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">Overview</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {session?.user?.name ? `Welcome back, ${session.user.name.split(" ")[0]}` : "Internal Dashboard"}
              </p>
            </div>
          }
          right={
            <div className="flex items-center gap-3">
              <button
                onClick={() => { fetchKPI(); fetchTickets(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
              <span className="text-xs text-slate-400 dark:text-slate-600">
                {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          }
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">

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

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Tickets Table */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Recently Updated Issues
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
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                    ))}
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="p-10 text-center">
                    <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-400 opacity-50" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No tickets yet</p>
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

              {/* AI Insights */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    AI Insights
                  </h2>
                </div>
                <div className="p-4 space-y-3">
                  {mockAiInsights.map((insight) => {
                    const Icon = insight.icon;
                    const styles = {
                      critical: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
                      suggestion: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
                      info: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
                    };
                    return (
                      <div
                        key={insight.id}
                        className={`p-3 rounded-lg border text-xs leading-relaxed ${styles[insight.type as keyof typeof styles]}`}
                      >
                        <div className="flex gap-2">
                          <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <span>{insight.title}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {kpiData && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                      SLA Health
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">Breached</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">{kpiData.slaBreachedCount ?? 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">At risk</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">{kpiData.slaBreachRiskCount ?? 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">Avg resolution</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.round(kpiData.avgResolutionTime ?? 0)}d</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
