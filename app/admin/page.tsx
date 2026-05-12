"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, AlertCircle, Zap, Bell, Activity,
  ChevronRight, ArrowUpRight, Bot,
  CheckCircle, AlertTriangle, XCircle, Clock, Timer, ShieldAlert,
  UserX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Stats {
  kpis: {
    totalCustomers: number;
    totalIssues: number;
    openIssues: number;
    slaHealth: number;
    resolvedIssues: number;
    slaRiskCount: number;
    unassignedCount: number;
    criticalCount: number;
    avgFrtHours: number | null;
    deltas: {
      openIssues: { pct: string; dir: 'up' | 'down' | 'neutral' };
      critical: { pct: string; dir: 'up' | 'down' | 'neutral' };
      unassigned: { pct: string; dir: 'up' | 'down' | 'neutral' };
      avgFrt: { pct: string; dir: 'up' | 'down' | 'neutral' };
    };
  };
  actionStrip: {
    criticalSlaAtRisk: number;
    unrespondedOver24h: number;
    unassignedOver4h: number;
    slaBreachedCount: number;
  };
  agentWorkload: { id: string; name: string; role: string; open: number; critical: number }[];
  topCategories: { category: string; count: number }[];
  clients: { id: string; name: string }[];
  aiInsights: { type: string; title: string; message: string }[];
  volumeByDay: { day: string; created: number; resolved: number }[];
  customerHealth: {
    id: string; name: string; isActive: boolean; lastActive: string;
    userCount: number; openIssues: number; slaBreaches: number; totalIssues: number; csat: number;
  }[];
  feed: FeedEntry[];
}

interface FeedEntry {
  id: string;
  type: 'escalated' | 'sla_breached' | 'assigned' | 'resolved' | 'status_changed' | 'ai_routed' | 'priority_changed';
  message: string;
  sub: string;
  ticketKey: string | null;
  issueId: string;
  time: string;
  priority?: string;
}

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accentColor: string;
  icon: LucideIcon;
  iconColor: string;
  onClick?: () => void;
  delta?: string;
  dir?: 'up' | 'down' | 'neutral';
  upIsGood?: boolean;
}

function KpiCard({ label, value, sub, accentColor, iconColor, icon: Icon, onClick, delta, dir, upIsGood = false }: KpiCardProps) {
  const showDelta = delta && delta !== '—' && dir && dir !== 'neutral';
  const isPositive = dir === 'up' ? upIsGood : !upIsGood;
  const deltaColor = showDelta
    ? isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
    : 'text-slate-400';
  const Arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '';

  return (
    <div
      onClick={onClick}
      className={`group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 border-l-[3px] ${accentColor} ${onClick ? 'cursor-pointer hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150' : ''}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">{label}</p>
        <div className={`p-1 rounded-md ${iconColor}`}>
          <Icon className="w-3 h-3" />
        </div>
      </div>
      <p className="text-[22px] font-bold tabular-nums text-slate-900 dark:text-slate-50 leading-none">{value}</p>
      <div className="flex items-center gap-1.5 mt-1">
        {showDelta && (
          <span className={`text-[11px] font-semibold ${deltaColor}`}>{Arrow} {delta}</span>
        )}
        {sub && (
          <span className="text-[11px] text-slate-400 dark:text-slate-500">{showDelta ? '· ' : ''}{sub}</span>
        )}
      </div>
    </div>
  );
}

const feedMeta: Record<FeedEntry['type'], { dot: string }> = {
  escalated:        { dot: 'bg-red-500' },
  sla_breached:     { dot: 'bg-amber-500' },
  assigned:         { dot: 'bg-blue-500' },
  resolved:         { dot: 'bg-emerald-500' },
  status_changed:   { dot: 'bg-slate-400' },
  ai_routed:        { dot: 'bg-violet-500' },
  priority_changed: { dot: 'bg-orange-500' },
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [customerFilter, setCustomerFilter] = useState('');
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  const fetchStats = async (d?: number, cId?: string) => {
    const useDays = d ?? days;
    const useClient = cId !== undefined ? cId : customerFilter;
    const params = new URLSearchParams({ days: String(useDays) });
    if (useClient) params.set('clientId', useClient);
    try {
      const res = await fetch('/api/admin/stats?' + params.toString());
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setFeed(data.feed ?? []);
      }
      else console.error('Admin stats API error:', res.status, await res.text());
    } catch (e) { console.error('Admin stats fetch failed:', e); }
    finally { setLoading(false); setFeedLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleDaysChange = (d: number) => {
    setDays(d); setLoading(true); fetchStats(d);
  };

  const handleCustomerChange = (cId: string) => {
    setCustomerFilter(cId); setLoading(true); setFeedLoading(true);
    fetchStats(undefined, cId);
  };

  const chartData = stats?.volumeByDay ?? [];

  const handleAlertClick = (filter: string) => {
    const params = new URLSearchParams();
    if (filter === 'unassigned') params.set('unassigned', 'true');
    else if (filter === 'slaAtRisk') params.set('slaAtRisk', 'true');
    else if (filter === 'slaBreached') params.set('slaBreached', 'true');
    router.push(`/tickets?${params.toString()}`);
  };

  const insightStyle = (type: string) =>
    type === 'error'
      ? { bg: 'bg-red-50 dark:bg-red-950/30', icon: 'text-red-500', border: 'border-red-100 dark:border-red-900' }
      : type === 'warning'
      ? { bg: 'bg-amber-50 dark:bg-amber-950/30', icon: 'text-amber-500', border: 'border-amber-100 dark:border-amber-900' }
      : { bg: 'bg-blue-50 dark:bg-blue-950/30', icon: 'text-blue-500', border: 'border-blue-100 dark:border-blue-900' };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const filteredCustomers = stats?.customerHealth ?? [];
  const filteredAgents = stats?.agentWorkload ?? [];
  const maxOpen = Math.max(...filteredAgents.map(a => a.open), 1);

  const agentBarColor = (open: number) =>
    open >= 15 ? '#EF4444' : open >= 8 ? '#F59E0B' : '#10B981';

  const segBtn = (active: boolean) =>
    `px-3 py-1 text-xs rounded-md font-medium transition-colors ${active
      ? 'bg-[#0052CC] text-white shadow-sm'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`;

  const showActionStrip = !loading && !!(
    (stats?.actionStrip.criticalSlaAtRisk ?? 0) > 0 ||
    (stats?.actionStrip.slaBreachedCount ?? 0) > 0 ||
    (stats?.actionStrip.unrespondedOver24h ?? 0) > 0 ||
    (stats?.actionStrip.unassignedOver4h ?? 0) > 0
  );

  const totalAlerts = showActionStrip
    ? Object.values(stats?.actionStrip ?? {}).reduce((a, b) => a + (b as number), 0)
    : 0;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F8F9FB] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Admin Dashboard</span>
            </div>
          }
          right={undefined}
        />

        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3 flex-wrap shadow-sm">
            <select
              value={customerFilter}
              onChange={e => handleCustomerChange(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20 focus:border-[#0052CC] transition-colors"
            >
              <option value="">All Customers</option>
              {(stats?.clients ?? []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
              {[7, 30, 60].map(d => (
                <button key={d} onClick={() => handleDaysChange(d)} className={segBtn(days === d)}>
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {loading ? [...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-l-[3px] border-l-slate-200 p-5 animate-pulse">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-20" />
                  <div className="h-6 w-6 bg-slate-100 dark:bg-slate-800 rounded-md" />
                </div>
                <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded w-14 mb-2" />
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-16" />
              </div>
            )) : (<>
              <KpiCard
                label="Open Tickets"
                value={stats?.kpis.openIssues}
                sub="vs prev period"
                accentColor="border-l-slate-500"
                iconColor="bg-slate-100 dark:bg-slate-800 text-slate-500"
                icon={AlertCircle}
                onClick={() => router.push('/tickets?status=OPEN')}
                delta={stats?.kpis.deltas.openIssues.pct}
                dir={stats?.kpis.deltas.openIssues.dir}
                upIsGood={false}
              />
              <KpiCard
                label="SLA at Risk"
                value={stats?.kpis.slaRiskCount}
                sub="due within 2h"
                accentColor="border-l-amber-400"
                iconColor="bg-amber-50 dark:bg-amber-950/40 text-amber-500"
                icon={Clock}
                onClick={() => router.push('/tickets?slaAtRisk=true')}
              />
              <KpiCard
                label="Unassigned"
                value={stats?.kpis.unassignedCount}
                sub="vs prev period"
                accentColor="border-l-slate-400"
                iconColor="bg-slate-100 dark:bg-slate-800 text-slate-500"
                icon={UserX}
                onClick={() => router.push('/tickets?unassigned=true')}
                delta={stats?.kpis.deltas.unassigned.pct}
                dir={stats?.kpis.deltas.unassigned.dir}
                upIsGood={false}
              />
              <KpiCard
                label="Avg FRT"
                value={stats?.kpis.avgFrtHours != null
                  ? stats.kpis.avgFrtHours < 1
                    ? `${Math.round(stats.kpis.avgFrtHours * 60)}m`
                    : `${stats.kpis.avgFrtHours.toFixed(1)}h`
                  : '—'}
                sub="vs prev period"
                accentColor="border-l-blue-400"
                iconColor="bg-blue-50 dark:bg-blue-950/40 text-blue-500"
                icon={Timer}
                delta={stats?.kpis.deltas.avgFrt.pct}
                dir={stats?.kpis.deltas.avgFrt.dir}
                upIsGood={false}
              />
              <KpiCard
                label="Critical"
                value={stats?.kpis.criticalCount}
                sub="vs prev period"
                accentColor="border-l-red-500"
                iconColor="bg-red-50 dark:bg-red-950/40 text-red-500"
                icon={ShieldAlert}
                onClick={() => router.push('/tickets?priority=CRITICAL')}
                delta={stats?.kpis.deltas.critical.pct}
                dir={stats?.kpis.deltas.critical.dir}
                upIsGood={false}
              />
            </>)}
          </div>

          {/* Row 1 — Backlog Trend | Urgent Alerts */}
          <div className="grid grid-cols-3 gap-4">

            {/* Backlog Trend */}
            <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Backlog Trend</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Volume · last {days} days</p>
                </div>
                <button onClick={() => router.push('/admin/analytics')}
                  className="flex items-center gap-1 text-xs font-medium text-[#0052CC] hover:text-[#0747A6] transition-colors">
                  Deep analysis <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              {loading ? (
                <div className="h-36 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg" />
              ) : (() => {
                const totalCreated = chartData.reduce((s, d) => s + (d.created ?? 0), 0);
                const totalResolved = chartData.reduce((s, d) => s + (d.resolved ?? 0), 0);
                const net = totalCreated - totalResolved;
                const growing = net > 0;
                return (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#0052CC]" />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Created</span>
                        <span className="text-[11px] font-bold tabular-nums text-slate-800 dark:text-slate-200">{totalCreated}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Resolved</span>
                        <span className="text-[11px] font-bold tabular-nums text-slate-800 dark:text-slate-200">{totalResolved}</span>
                      </div>
                      <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${growing ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-emerald-50 dark:bg-emerald-950/20'}`}>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Net</span>
                        <span className={`text-[11px] font-bold tabular-nums ${growing ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {net > 0 ? `+${net}` : net === 0 ? '±0' : net}
                        </span>
                        <span className={`text-[10px] font-medium ${growing ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {growing ? '↑ growing' : '↓ shrinking'}
                        </span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="adminCreatedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0052CC" stopOpacity={0.12} />
                            <stop offset="95%" stopColor="#0052CC" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="adminResolvedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.12} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                          interval={Math.floor(chartData.length / 5)} />
                        <YAxis hide allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ fontSize: 11, borderRadius: 8, padding: '6px 12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)' }}
                          formatter={(value, name) => [value, name === "created" ? "Created" : "Resolved"]}
                        />
                        <Area type="monotone" dataKey="created" stroke="#0052CC" strokeWidth={1.5} fill="url(#adminCreatedGrad)" dot={false} name="created" />
                        <Area type="monotone" dataKey="resolved" stroke="#10B981" strokeWidth={1.5} fill="url(#adminResolvedGrad)" dot={false} name="resolved" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </>
                );
              })()}
            </div>

            {/* Urgent Alerts */}
            <div className="col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
              <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Alerts</span>
                </div>
                {totalAlerts > 0 && (
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-1.5 py-0.5 rounded-full tabular-nums">
                    {totalAlerts}
                  </span>
                )}
              </div>
              <div className="px-3 py-3 space-y-2 flex-1">
                {loading ? (
                  [...Array(3)].map((_, i) => <div key={i} className="h-10 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg" />)
                ) : !showActionStrip ? (
                  <div className="flex items-center gap-2.5 px-3 py-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">All clear</span>
                  </div>
                ) : (
                  <>
                    {(stats?.actionStrip.criticalSlaAtRisk ?? 0) > 0 && (
                      <button onClick={() => handleAlertClick('slaAtRisk')}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors text-left group">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-red-700 dark:text-red-400">Critical + SLA at Risk</p>
                          <p className="text-[10px] text-red-500/80 dark:text-red-500">{stats?.actionStrip.criticalSlaAtRisk} need attention</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-red-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                      </button>
                    )}
                    {(stats?.actionStrip.slaBreachedCount ?? 0) > 0 && (
                      <button onClick={() => handleAlertClick('slaBreached')}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors text-left group">
                        <XCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">SLA Breached</p>
                          <p className="text-[10px] text-amber-600/80 dark:text-amber-500">{stats?.actionStrip.slaBreachedCount} breaches open</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                      </button>
                    )}
                    {(stats?.actionStrip.unrespondedOver24h ?? 0) > 0 && (
                      <button onClick={() => router.push('/tickets?unresponded=true')}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group">
                        <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Response &gt;24h</p>
                          <p className="text-[10px] text-slate-500">{stats?.actionStrip.unrespondedOver24h} tickets waiting</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                      </button>
                    )}
                    {(stats?.actionStrip.unassignedOver4h ?? 0) > 0 && (
                      <button onClick={() => handleAlertClick('unassigned')}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group">
                        <UserX className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Unassigned &gt;4h</p>
                          <p className="text-[10px] text-slate-500">{stats?.actionStrip.unassignedOver4h} unassigned</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Row 2 — Agent Workload | Customer Health */}
          <div className="grid grid-cols-3 gap-4">

            {/* Agent Workload */}
            <div className="col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Agent Workload</h2>
                <Users className="w-3.5 h-3.5 text-slate-400" />
              </div>
              {loading ? (
                <div className="space-y-3.5">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2.5 animate-pulse">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-24" />
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredAgents.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No agents assigned</p>
              ) : (
                <div className="space-y-3.5">
                  {filteredAgents.map(agent => {
                    const initials = (agent.name ?? '?').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
                    const pct = Math.round((agent.open / maxOpen) * 100);
                    const barColor = agentBarColor(agent.open);
                    return (
                      <div key={agent.id} className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#0747A6] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{agent.name}</span>
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{agent.open}</span>
                              {agent.critical > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold border border-red-100 dark:border-red-900">
                                  {agent.critical}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Customer Health */}
            <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Customer Health</h2>
                <button onClick={() => router.push('/admin/customers')}
                  className="flex items-center gap-1 text-xs font-medium text-[#0052CC] hover:text-[#0747A6] transition-colors">
                  View all <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              {loading ? (
                <div className="p-5 space-y-2">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-10 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        {['Customer', 'Users', 'Open', 'SLA Breaches', 'CSAT', 'Status'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                      {filteredCustomers.map(c => (
                        <tr key={c.id} onClick={() => router.push(`/admin/customers?id=${c.id}`)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group">
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 text-xs">
                            <span className="group-hover:text-[#0052CC] dark:group-hover:text-blue-400 transition-colors">{c.name}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">{c.userCount}</td>
                          <td className="px-4 py-3 text-xs tabular-nums">
                            <span className={
                              c.openIssues > 10 ? 'text-red-600 dark:text-red-400 font-semibold' :
                              c.openIssues > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' :
                              'text-slate-400 dark:text-slate-500'
                            }>{c.openIssues}</span>
                          </td>
                          <td className="px-4 py-3 text-xs tabular-nums">
                            <span className={c.slaBreaches > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}>
                              {c.slaBreaches}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-14 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${c.csat >= 85 ? 'bg-emerald-500' : c.csat >= 70 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${c.csat}%` }} />
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">{c.csat}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                              {c.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-slate-400">No customers match filters</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Row 3 — Live Activity | Operational Intelligence */}
          <div className="grid grid-cols-3 gap-4">

            {/* Live Activity Feed */}
            <div className="col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
              <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Live Activity</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-slate-400">Live</span>
                </div>
              </div>
              <div className="overflow-y-auto px-2 py-2 space-y-0.5" style={{ maxHeight: 320 }}>
                {feedLoading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-2.5 animate-pulse px-2 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-1.5 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
                      </div>
                    </div>
                  ))
                ) : feed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Zap className="w-5 h-5 text-slate-300 mb-2" />
                    <p className="text-xs text-slate-400">No recent activity</p>
                  </div>
                ) : (
                  feed.map(entry => {
                    const meta = feedMeta[entry.type];
                    return (
                      <button key={entry.id}
                        onClick={() => entry.issueId && router.push(`/tickets/${entry.issueId}`)}
                        className="w-full flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group">
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 leading-snug group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{entry.message}</p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{entry.ticketKey ? `${entry.ticketKey} · ` : ''}{entry.sub}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1 mt-0.5 tabular-nums">{timeAgo(entry.time)}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Operational Intelligence */}
            <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Operational Intelligence</span>
                <span className="text-[10px] text-slate-400 ml-auto">Trends · Patterns</span>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
                      <div className="flex-1 space-y-2 pt-0.5">
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-24" />
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                      </div>
                    </div>
                  ))
                ) : (
                  (stats?.aiInsights ?? []).map((insight, i) => {
                    const s = insightStyle(insight.type);
                    return (
                      <div key={i} className={`flex gap-3 p-3 rounded-lg border ${s.border} ${s.bg}`}>
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${s.icon} bg-white/60 dark:bg-black/20`}>
                          {insight.type === 'error' ? <XCircle className="w-3.5 h-3.5" /> :
                           insight.type === 'warning' ? <AlertTriangle className="w-3.5 h-3.5" /> :
                           <CheckCircle className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{insight.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{insight.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
