"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  Lightbulb,
  MessageSquare,
  BookOpen,
  Bell,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";
import { CustomerUserInsights } from "@/components/dashboard/CustomerUserInsights";
import { CustomerAdminInsights } from "@/components/dashboard/CustomerAdminInsights";

interface DashboardIssue {
  id: string;
  ticketKey: string | null;
  title: string;
  status: string;
  priority: string;
  slaBreached?: boolean;
  slaBreachRisk?: boolean;
  createdAt?: string;
  updatedAt: string;
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${map[status] ?? map.CLOSED}`}>
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
  return <span className={`inline-block w-2 h-2 rounded-full ${map[priority?.toUpperCase()] ?? "bg-slate-400"}`} title={priority} />;
}

function KpiSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-l-[3px] border-l-slate-200 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="h-3 w-28 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
      <div className="h-7 w-12 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
      <div className="mt-2 h-3 w-36 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
    </div>
  );
}

export default function UserDashboard() {
  const { data: session } = useSession();
  const router = useRouter();

  const [issues, setIssues] = useState<DashboardIssue[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const userRole = session?.user?.role as string | undefined;
  const isClientUser = userRole === "CLIENT_USER";
  const isClientAdmin = userRole === "CLIENT_ADMIN";

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setIssues(data.tickets ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const openIssues = issues.filter((t) => t.status === "OPEN" || t.status === "ACKNOWLEDGED" || t.status === "IN_PROGRESS");
  const awaitingResponse = issues.filter((t) => t.status === "ACKNOWLEDGED");
  const slaNeedsAttention = issues.filter((t) => t.slaBreached || t.slaBreachRisk);
  const resolvedThisMonth = issues.filter((t) => {
    if (t.status !== "RESOLVED" && t.status !== "CLOSED") return false;
    const d = new Date(t.updatedAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const recentIssues = [...issues]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F8F9FB] dark:bg-slate-950">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Welcome, {firstName}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Personal issue tracker</p>
            </div>
          }
          right={null}
        />

        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? (
                <>
                  <KpiSkeleton />
                  <KpiSkeleton />
                  <KpiSkeleton />
                  <KpiSkeleton />
                </>
              ) : (
                <>
              <div
                onClick={() => router.push("/tickets?status=OPEN")}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-l-[3px] border-l-slate-400 px-4 py-3 cursor-pointer hover:shadow-md shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">My Open Issues</p>
                  <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800">
                    <AlertCircle className="w-3 h-3 text-slate-500" />
                  </div>
                </div>
                <p className="text-[22px] font-bold tabular-nums text-slate-900 dark:text-slate-50 leading-none">
                  {loading ? "—" : openIssues.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Open · Acknowledged · In Progress</p>
              </div>

              <div
                onClick={() => router.push("/tickets?status=ACKNOWLEDGED")}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-l-[3px] border-l-blue-400 px-4 py-3 cursor-pointer hover:shadow-md shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Awaiting Response</p>
                  <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/40">
                    <MessageSquare className="w-3 h-3 text-blue-500" />
                  </div>
                </div>
                <p className="text-[22px] font-bold tabular-nums text-slate-900 dark:text-slate-50 leading-none">
                  {loading ? "—" : awaitingResponse.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Agent is reviewing your issues</p>
              </div>

              <div
                onClick={() => router.push("/tickets")}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-l-[3px] border-l-orange-400 px-4 py-3 cursor-pointer hover:shadow-md shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SLA Attention</p>
                  <div className="p-1 rounded-md bg-orange-50 dark:bg-orange-950/40">
                    <ShieldCheck className="w-3 h-3 text-orange-500" />
                  </div>
                </div>
                <p className="text-[22px] font-bold tabular-nums text-slate-900 dark:text-slate-50 leading-none">
                  {loading ? "—" : slaNeedsAttention.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Breached or at risk</p>
              </div>

              <div
                onClick={() => router.push("/tickets?status=RESOLVED")}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-l-[3px] border-l-emerald-400 px-4 py-3 cursor-pointer hover:shadow-md shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Resolved This Month</p>
                  <div className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                  </div>
                </div>
                <p className="text-[22px] font-bold tabular-nums text-slate-900 dark:text-slate-50 leading-none">
                  {loading ? "—" : resolvedThisMonth.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
                </p>
              </div>
                </>
              )}
            </div>

            {loading ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 flex items-start gap-4">
                <div className="h-5 w-5 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-52 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-3 w-72 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
                <div className="h-4 w-20 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            ) : (
              <div className={`rounded-xl border px-5 py-4 flex items-start gap-4 ${
                slaNeedsAttention.length > 0
                  ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                  : "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20"
              }`}>
                <div className="flex-shrink-0 mt-0.5">
                  {slaNeedsAttention.length > 0 ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-bold ${slaNeedsAttention.length > 0 ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                      Support Health: {slaNeedsAttention.length > 0 ? "Needs attention" : "Healthy"}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${slaNeedsAttention.length > 0 ? "bg-red-400" : "bg-emerald-400"}`} />
                  </div>
                  <p className={`text-xs ${slaNeedsAttention.length > 0 ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"} opacity-90`}>
                    {slaNeedsAttention.length > 0
                      ? `${slaNeedsAttention.length} ticket${slaNeedsAttention.length !== 1 ? "s" : ""} may need a response or follow-up.`
                      : "Your active tickets are currently within expected SLA windows."}
                  </p>
                </div>
                <button
                  onClick={() => router.push("/tickets")}
                  className={`flex-shrink-0 text-xs font-medium ${slaNeedsAttention.length > 0 ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"} hover:underline flex items-center gap-1`}
                >
                  View tickets <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Insights + Recent Issues (Two Column) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left Column - Insights */}
              <div className="lg:col-span-1">
                {isClientUser && <CustomerUserInsights issues={issues} loading={loading} />}
                {isClientAdmin && <CustomerAdminInsights />}
              </div>

              {/* Right Column - Recent Issues */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">My Recent Issues</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/tickets")}
                  className="text-xs text-[#0052CC] dark:text-blue-400 hover:text-[#0747A6] h-7 px-2"
                >
                  View all <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>

              {loading ? (
                <div className="p-5 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : recentIssues.length === 0 ? (
                <div className="p-10 text-center">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-400 opacity-40" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">No issues yet</p>
                  <Button
                    size="sm"
                    onClick={() => router.push("/create-ticket")}
                    className="bg-[#0052CC] hover:bg-[#0747A6] text-white"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Raise your first issue
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ID</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Summary</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">P</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {recentIssues.map((t) => (
                        <tr
                          key={t.id}
                          onClick={() => router.push(`/tickets/${t.ticketKey ?? t.id}`)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        >
                          <td className="px-5 py-3">
                            <span className="font-mono text-xs font-bold text-[#0052CC] dark:text-blue-400 whitespace-nowrap">
                              {t.ticketKey ?? t.id.slice(0, 8).toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-3 max-w-[280px]">
                            <span className="text-xs text-slate-800 dark:text-slate-200 truncate block">{t.title}</span>
                          </td>
                          <td className="px-3 py-3"><PriorityDot priority={t.priority} /></td>
                          <td className="px-3 py-3"><StatusLozenge status={t.status} /></td>
                          <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {new Date(t.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              </div>
            </div>

            {/* AI Tip + Knowledge Base CTA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* AI Tip */}
              <div className="flex items-start gap-3 px-4 py-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">AI Tip</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Before raising an issue, search our Knowledge Base — many common questions are answered there instantly, saving you waiting time.
                  </p>
                  <button
                    onClick={() => router.push("/knowledge-base")}
                    className="mt-2 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 flex items-center gap-1"
                  >
                    Browse Knowledge Base <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Quick actions */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Quick Actions</p>
                <button
                  onClick={() => router.push("/knowledge-base")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
                >
                  <BookOpen className="w-4 h-4 flex-shrink-0 text-[#0052CC]" />
                  Knowledge Base
                </button>
                <button
                  onClick={() => router.push("/notifications")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
                >
                  <Bell className="w-4 h-4 flex-shrink-0 text-[#0052CC]" />
                  View Notifications
                </button>
              </div>
            </div>

        </main>
      </div>
    </div>
  );
}
