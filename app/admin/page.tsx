"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users, AlertCircle, TrendingUp, ShieldCheck, Zap, Bell, Activity,
  RefreshCw, ChevronRight, ArrowUpRight, Bot, BarChart3, Server,
  CheckCircle, AlertTriangle, XCircle,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Stats {
  kpis: {
    totalCustomers: number;
    totalIssues: number;
    activeUsers: number;
    openIssues: number;
    slaHealth: number;
    resolvedIssues: number;
    issuesLast30: number;
    issuesLast60: number;
  };
  volumeByDay: { day: string; count: number }[];
  customerHealth: {
    id: string; name: string; isActive: boolean; lastActive: string;
    userCount: number; openIssues: number; slaBreaches: number; totalIssues: number; csat: number;
  }[];
  systemAlerts: { id: number; type: string; message: string; time: string }[];
  aiStats: { classifiedToday: number; suggestionsUsed: number; avgAccuracy: number; routingDecisions: number };
}

function KpiCard({ label, value, sub, color, icon: Icon, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 border-l-4 ${color} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) setStats(await res.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  const refresh = () => { setRefreshing(true); fetchStats(); };

  // Fill missing days in volume chart
  const chartData = (() => {
    if (!stats) return [];
    const map = new Map(stats.volumeByDay.map((d) => [d.day, d.count]));
    const result = [];
    for (let i = 59; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      result.push({ day: key.slice(5), count: map.get(key) ?? 0 });
    }
    return result;
  })();

  const alertIcon = (type: string) =>
    type === 'error' ? <XCircle className="w-4 h-4 text-red-500" /> :
    type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
    <CheckCircle className="w-4 h-4 text-blue-500" />;

  const alertBg = (type: string) =>
    type === 'error' ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20' :
    type === 'warning' ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20' :
    'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20';

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-700 dark:text-slate-300 font-medium">Admin Dashboard</span>
            </div>
          }
          right={
            <button onClick={refresh} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Customers" value={loading ? '—' : stats?.kpis.totalCustomers} color="border-l-purple-500"
              icon={Users} onClick={() => router.push('/admin/customers')} />
            <KpiCard label="Total Issues" value={loading ? '—' : stats?.kpis.totalIssues} sub={`${stats?.kpis.openIssues ?? 0} open`}
              color="border-l-red-500" icon={AlertCircle} onClick={() => router.push('/tickets')} />
            <KpiCard label="Active Users" value={loading ? '—' : stats?.kpis.activeUsers} color="border-l-blue-500"
              icon={Activity} onClick={() => router.push('/admin/users')} />
            <KpiCard label="SLA Health" value={loading ? '—' : `${stats?.kpis.slaHealth}%`}
              sub={`${stats?.kpis.issuesLast30 ?? 0} issues this month`}
              color={`border-l-${(stats?.kpis.slaHealth ?? 100) >= 85 ? 'emerald' : 'amber'}-500`}
              icon={ShieldCheck} onClick={() => router.push('/admin/sla-config')} />
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Volume chart */}
            <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Issue Volume</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Last 60 days — all customers</p>
                </div>
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </div>
              {loading ? (
                <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} interval={9} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="count" stroke="#0052CC" strokeWidth={2} dot={false} name="Issues" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* System Alerts */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">System Alerts</h2>
                <Bell className="w-4 h-4 text-slate-400" />
              </div>
              <div className="space-y-2">
                {(stats?.systemAlerts ?? []).map((alert) => (
                  <div key={alert.id} className={`flex gap-2.5 p-2.5 rounded-lg border text-xs ${alertBg(alert.type)}`}>
                    {alertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 dark:text-slate-300 leading-snug">{alert.message}</p>
                      <p className="text-slate-400 mt-0.5">{alert.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Customer Health Table */}
            <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Customer Health</h2>
                <button onClick={() => router.push('/admin/customers')}
                  className="flex items-center gap-1 text-xs text-[#0052CC] hover:underline">
                  View all <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              {loading ? (
                <div className="p-5 space-y-2">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        {['Customer', 'Users', 'Open Issues', 'SLA Breaches', 'CSAT', 'Status'].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {(stats?.customerHealth ?? []).map((c) => (
                        <tr key={c.id} onClick={() => router.push(`/admin/customers?id=${c.id}`)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{c.name}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{c.userCount}</td>
                          <td className="px-4 py-3">
                            <span className={c.openIssues > 0 ? 'text-red-600 font-semibold' : 'text-slate-500 dark:text-slate-400'}>{c.openIssues}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={c.slaBreaches > 0 ? 'text-amber-600 font-semibold' : 'text-slate-500 dark:text-slate-400'}>{c.slaBreaches}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${c.csat >= 85 ? 'bg-emerald-500' : c.csat >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${c.csat}%` }} />
                              </div>
                              <span className="text-xs text-slate-600 dark:text-slate-400">{c.csat}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                              {c.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(stats?.customerHealth ?? []).length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No customers yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* AI Platform Stats */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">AI Platform</h2>
                <Bot className="w-4 h-4 text-slate-400" />
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Issues Auto-Classified Today', value: stats?.aiStats.classifiedToday, icon: Zap, color: 'text-blue-600' },
                  { label: 'Suggested Responses Used', value: stats?.aiStats.suggestionsUsed, icon: CheckCircle, color: 'text-emerald-600' },
                  { label: 'Routing Decisions Made', value: stats?.aiStats.routingDecisions, icon: Activity, color: 'text-purple-600' },
                  { label: 'Avg Prediction Accuracy', value: `${stats?.aiStats.avgAccuracy}%`, icon: BarChart3, color: 'text-amber-600' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{label}</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">{loading ? '—' : value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => router.push('/admin/ai-config')}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#0052CC] dark:text-blue-400 hover:underline">
                  Configure AI settings <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick nav shortcuts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Customer Workspaces', icon: Users, route: '/admin/customers', color: 'from-purple-500 to-purple-700' },
              { label: 'User Management', icon: Activity, route: '/admin/users', color: 'from-blue-500 to-blue-700' },
              { label: 'SLA Configuration', icon: ShieldCheck, route: '/admin/sla-config', color: 'from-emerald-500 to-emerald-700' },
              { label: 'Platform Analytics', icon: BarChart3, route: '/admin/analytics', color: 'from-amber-500 to-amber-600' },
              { label: 'AI Configuration', icon: Bot, route: '/admin/ai-config', color: 'from-indigo-500 to-indigo-700' },
              { label: 'KB Management', icon: Server, route: '/admin/kb', color: 'from-teal-500 to-teal-700' },
              { label: 'Audit Trail', icon: AlertTriangle, route: '/admin/audit', color: 'from-rose-500 to-rose-700' },
              { label: 'System Settings', icon: Zap, route: '/admin/settings', color: 'from-slate-500 to-slate-700' },
            ].map(({ label, icon: Icon, route, color }) => (
              <button key={route} onClick={() => router.push(route)}
                className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br ${color} text-white hover:opacity-90 transition-opacity text-left`}>
                <Icon className="w-5 h-5 flex-shrink-0 opacity-80" />
                <span className="text-sm font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
