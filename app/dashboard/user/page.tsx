"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  Plus,
  ArrowUpRight,
  RefreshCw,
  Lightbulb,
  MessageSquare,
  BookOpen,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { CustomerUserInsights } from "@/components/dashboard/CustomerUserInsights";
import { CustomerAdminInsights } from "@/components/dashboard/CustomerAdminInsights";

interface DashboardIssue {
  id: string;
  ticketKey: string | null;
  title: string;
  status: string;
  priority: string;
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${map[status] ?? map.CLOSED}`}>
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
      const res = await fetch("/api/dashboard/tickets", { cache: "no-store" });
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
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">My Dashboard</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Personal issue tracker</p>
            </div>
          }
          right={
            <button
              onClick={fetchIssues}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-lg border border-blue-700/20 bg-[#0B55C8] p-5 text-white shadow-sm">
              <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_48%)]" />
              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-100/80">
                    Personal support overview
                  </p>
                  <h2 className="text-xl font-semibold tracking-normal">
                    Welcome back, {firstName}
                  </h2>
                  <p className="mt-1.5 max-w-2xl text-sm leading-5 text-blue-50/90">
                    {loading
                      ? "Loading your issue summary..."
                      : openIssues.length === 0
                        ? "You have no open issues right now. Everything looks clear."
                        : `${openIssues.length} active issue${openIssues.length !== 1 ? "s" : ""} need your attention or are currently in progress.`}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-white/12 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/15">
                      <AlertCircle className="h-3.5 w-3.5 text-blue-100" />
                      {loading ? "-" : openIssues.length} active
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-white/12 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/15">
                      <MessageSquare className="h-3.5 w-3.5 text-blue-100" />
                      {loading ? "-" : awaitingResponse.length} awaiting response
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-white/12 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/15">
                      <CheckCircle className="h-3.5 w-3.5 text-blue-100" />
                      {loading ? "-" : resolvedThisMonth.length} resolved this month
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => router.push("/create-ticket")}
                  className="h-9 flex-shrink-0 bg-white px-4 text-[#0052CC] shadow-sm hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Raise New Issue
                </Button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                onClick={() => router.push("/tickets?status=OPEN")}
                className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 border-l-4 border-l-red-500 p-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">My Open Issues</p>
                  <AlertCircle className="w-4 h-4 text-red-500 opacity-60" />
                </div>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {loading ? "—" : openIssues.length}
                </p>
                <p className="text-xs text-slate-500 mt-1">Open, Acknowledged, In Progress</p>
              </div>

              <div
                onClick={() => router.push("/tickets?status=ACKNOWLEDGED")}
                className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 border-l-4 border-l-purple-500 p-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Awaiting Response</p>
                  <MessageSquare className="w-4 h-4 text-purple-500 opacity-60" />
                </div>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {loading ? "—" : awaitingResponse.length}
                </p>
                <p className="text-xs text-slate-500 mt-1">Agent is reviewing your issues</p>
              </div>

              <div
                onClick={() => router.push("/tickets?status=RESOLVED")}
                className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-500 p-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Resolved This Month</p>
                  <CheckCircle className="w-4 h-4 text-emerald-500 opacity-60" />
                </div>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {loading ? "—" : resolvedThisMonth.length}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
                </p>
              </div>
            </div>

            {/* Insights + Recent Issues (Two Column) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Insights */}
              <div className="lg:col-span-1">
                {isClientUser && <CustomerUserInsights />}
                {isClientAdmin && <CustomerAdminInsights />}
              </div>

              {/* Right Column - Recent Issues */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">My Recent Issues</h2>
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
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">ID</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Summary</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">P</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Updated</th>
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
                            <span className="text-slate-800 dark:text-slate-200 truncate block">{t.title}</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* AI Tip */}
              <div className="flex items-start gap-3 px-4 py-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">AI Tip</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5 leading-relaxed">
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
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Quick Actions</p>
                <button
                  onClick={() => router.push("/create-ticket")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md bg-[#0052CC] hover:bg-[#0747A6] text-white text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  Raise a New Issue
                </button>
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

          </div>
        </main>
      </div>
    </div>
  );
}
