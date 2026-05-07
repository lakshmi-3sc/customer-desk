"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, AlertCircle, Zap, Bell, Activity,
  RefreshCw, ChevronRight, ArrowUpRight, Bot,
  CheckCircle, AlertTriangle, XCircle, Clock, Timer, ShieldAlert,
  UserX, Flame, Cpu, CheckCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
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
  color: string;
  icon: LucideIcon;
  onClick?: () => void;
  delta?: string;
  dir?: 'up' | 'down' | 'neutral';
  // upIsGood: true  → up=green, down=red (e.g. resolution rate)
  // upIsGood: false → up=red,   down=green (e.g. open tickets, FRT)
  upIsGood?: boolean;
}

function KpiCard({ label, value, sub, color, icon: Icon, onClick, delta, dir, upIsGood = false }: KpiCardProps) {
  const showDelta = delta && delta !== '—' && dir && dir !== 'neutral';
  const isPositive = dir === 'up' ? upIsGood : !upIsGood;
  const deltaColor = showDelta
    ? isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
    : 'text-slate-400';
  const Arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '';

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 border-l-4 ${color} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{value}</p>
      <div className="flex items-center gap-1.5 mt-1">
        {showDelta && (
          <span className={`text-xs font-semibold ${deltaColor}`}>{Arrow} {delta}</span>
        )}
        {sub && (
          <span className="text-xs text-slate-400">{showDelta ? '· ' : ''}{sub}</span>
        )}
      </div>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  BUG: 'Bug',
  FEATURE_REQUEST: 'Feature Request',
  DATA_ACCURACY: 'Data Accuracy',
  PERFORMANCE: 'Performance',
  ACCESS_SECURITY: 'Access / Security',
};

const CATEGORY_COLORS = ['#0052CC', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(30);
  const [customerFilter, setCustomerFilter] = useState('');
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  const fetchActivity = async (cId?: string) => {
    const useClient = cId !== undefined ? cId : customerFilter;
    const params = new URLSearchParams();
    if (useClient) params.set('clientId', useClient);
    try {
      const res = await fetch('/api/admin/activity?' + params.toString());
      if (res.ok) {
        const data = await res.json();
        setFeed(data.feed ?? []);
      }
    } catch {}
    finally { setFeedLoading(false); }
  };

  const fetchStats = async (d?: number, cId?: string) => {
    const useDays = d ?? days;
    const useClient = cId !== undefined ? cId : customerFilter;
    const params = new URLSearchParams({ days: String(useDays) });
    if (useClient) params.set('clientId', useClient);
    try {
      const res = await fetch('/api/admin/stats?' + params.toString());
      if (res.ok) setStats(await res.json());
      else console.error('Admin stats API error:', res.status, await res.text());
    } catch (e) { console.error('Admin stats fetch failed:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchStats(); fetchActivity(); }, []);

  const handleDaysChange = (d: number) => {
    setDays(d);
    setRefreshing(true);
    setLoading(true);
    fetchStats(d);
  };

  const handleCustomerChange = (cId: string) => {
    setCustomerFilter(cId);
    setRefreshing(true);
    setLoading(true);
    setFeedLoading(true);
    fetchStats(undefined, cId);
    fetchActivity(cId);
  };

  const refresh = () => {
    setRefreshing(true);
    setLoading(true);
    setFeedLoading(true);
    fetchStats();
    fetchActivity();
  };

  const chartData = stats?.volumeByDay ?? [];

  const handleAlertClick = (filter?: string) => {
    if (!filter) return;
    const params = new URLSearchParams();
    if (filter === 'critical') params.set('priority', 'CRITICAL');
    else if (filter === 'high') params.set('priority', 'HIGH');
    else if (filter === 'unassigned') params.set('unassigned', 'true');
    else if (filter === 'stale') params.set('stale', 'true');
    else if (filter === 'slaAtRisk') params.set('slaAtRisk', 'true');
    else if (filter === 'slaBreached') params.set('slaBreached', 'true');
    router.push(`/tickets?${params.toString()}`);
  };

  const alertIcon = (type: string) =>
    type === 'error' ? <XCircle className="w-4 h-4 text-red-500" /> :
    type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
    <CheckCircle className="w-4 h-4 text-blue-500" />;

  const alertBg = (type: string) =>
    type === 'error' ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20' :
    type === 'warning' ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20' :
    'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20';

  const insightIconBg = (type: string) =>
    type === 'error' ? 'bg-red-50 dark:bg-red-950/30 text-red-500' :
    type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-500' :
    'bg-blue-50 dark:bg-blue-950/30 text-blue-500';

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const feedMeta: Record<FeedEntry['type'], { icon: React.ReactNode; dot: string; label: string }> = {
    escalated:       { icon: <Flame className="w-3.5 h-3.5" />,     dot: 'bg-red-500',     label: 'Escalated' },
    sla_breached:    { icon: <ShieldAlert className="w-3.5 h-3.5" />, dot: 'bg-orange-500', label: 'SLA Breach' },
    assigned:        { icon: <Users className="w-3.5 h-3.5" />,      dot: 'bg-blue-500',    label: 'Assigned' },
    resolved:        { icon: <CheckCheck className="w-3.5 h-3.5" />, dot: 'bg-emerald-500', label: 'Resolved' },
    status_changed:  { icon: <Activity className="w-3.5 h-3.5" />,   dot: 'bg-slate-400',   label: 'Status' },
    ai_routed:       { icon: <Cpu className="w-3.5 h-3.5" />,        dot: 'bg-violet-500',  label: 'AI' },
    priority_changed:{ icon: <AlertTriangle className="w-3.5 h-3.5" />, dot: 'bg-red-600',  label: 'Critical' },
  };

  const filteredCustomers = stats?.customerHealth ?? [];

  const filteredAgents = stats?.agentWorkload ?? [];

  const maxOpen = Math.max(...filteredAgents.map(a => a.open), 1);

  const agentBarColor = (open: number) =>
    open >= 10 ? '#EF4444' : open >= 5 ? '#F59E0B' : '#10B981';

  const segBtn = (active: boolean) =>
    `px-3 py-1 text-xs rounded-md font-medium transition-colors ${active
      ? 'bg-[#0052CC] text-white'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`;

  const showActionStrip = !loading && !!(
    (stats?.actionStrip.criticalSlaAtRisk ?? 0) > 0 ||
    (stats?.actionStrip.slaBreachedCount ?? 0) > 0 ||
    (stats?.actionStrip.unrespondedOver24h ?? 0) > 0 ||
    (stats?.actionStrip.unassignedOver4h ?? 0) > 0
  );

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

        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3 flex-wrap">
            <select
              value={customerFilter}
              onChange={e => handleCustomerChange(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
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

          {/* KPI Row — 5 cards, full width */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {loading ? [...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border-l-4 border-l-slate-200 dark:border-l-slate-700 border border-slate-200 dark:border-slate-800 p-5 animate-pulse">
                <div className="flex items-start justify-between mb-2">
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-24" />
                  <div className="h-4 w-4 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
                <div className="h-7 bg-slate-100 dark:bg-slate-800 rounded w-12 mb-1.5" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-20" />
              </div>
            )) : (<>
              <KpiCard
                label="Open Tickets"
                value={stats?.kpis.openIssues}
                sub="vs prev period"
                color="border-l-red-500"
                icon={AlertCircle}
                onClick={() => router.push('/tickets?status=OPEN')}
                delta={stats?.kpis.deltas.openIssues.pct}
                dir={stats?.kpis.deltas.openIssues.dir}
                upIsGood={false}
              />
              <KpiCard
                label="SLA Risk"
                value={`${stats?.kpis.slaRiskCount} tickets`}
                sub="due within 2h"
                color="border-l-amber-500"
                icon={Clock}
                onClick={() => router.push('/tickets?slaAtRisk=true')}
              />
              <KpiCard
                label="Unassigned"
                value={stats?.kpis.unassignedCount}
                sub="vs prev period"
                color="border-l-orange-500"
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
                color="border-l-blue-500"
                icon={Timer}
                delta={stats?.kpis.deltas.avgFrt.pct}
                dir={stats?.kpis.deltas.avgFrt.dir}
                upIsGood={false}
              />
              <KpiCard
                label="Critical"
                value={stats?.kpis.criticalCount}
                sub="vs prev period"
                color="border-l-red-600"
                icon={ShieldAlert}
                onClick={() => router.push('/tickets?priority=CRITICAL')}
                delta={stats?.kpis.deltas.critical.pct}
                dir={stats?.kpis.deltas.critical.dir}
                upIsGood={false}
              />
            </>)}
          </div>

          {/* Row 1 — Backlog Trend | Urgent Alerts */}
          <div className="grid grid-cols-3 gap-5">
            {/* Backlog Trend */}
            <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Backlog Trend</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Are we keeping up? · last {days} days</p>
                </div>
                <button onClick={() => router.push('/admin/analytics')}
                  className="flex items-center gap-1 text-xs text-[#0052CC] hover:underline">
                  Deep analysis <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              {loading ? (
                <div className="h-36 animate-pulse bg-slate-100 dark:bg-slate-800 rounded" />
              ) : (() => {
                const totalCreated = chartData.reduce((sum, day) => sum + (day.created ?? 0), 0);
                const totalResolved = chartData.reduce((sum, day) => sum + (day.resolved ?? 0), 0);
                const net = totalCreated - totalResolved;
                const falling = net > 0;
                return (
                  <>
                    {/* Summary stat chips */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#0052CC] flex-shrink-0" />
                        <span className="text-xs text-slate-500">Created</span>
                        <span className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200">{totalCreated}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#10B981] flex-shrink-0" />
                        <span className="text-xs text-slate-500">Resolved</span>
                        <span className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200">{totalResolved}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${falling ? 'bg-red-50 dark:bg-red-950/20' : 'bg-emerald-50 dark:bg-emerald-950/20'}`}>
                        <span className="text-xs text-slate-500">Net backlog</span>
                        <span className={`text-xs font-bold tabular-nums ${falling ? 'text-red-500' : 'text-emerald-600'}`}>
                          {net > 0 ? `+${net}` : net === 0 ? '±0' : net}
                        </span>
                        <span className={`text-[10px] font-medium ${falling ? 'text-red-400' : 'text-emerald-500'}`}>
                          {falling ? '↑ growing' : '↓ shrinking'}
                        </span>
                      </div>
                    </div>

                    {/* Mini area chart — no axes labels, no legend */}
                    <ResponsiveContainer width="100%" height={120}>
                      <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="adminCreatedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0052CC" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#0052CC" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="adminResolvedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#cbd5e1" }} tickLine={false} axisLine={false}
                          interval={Math.floor(chartData.length / 5)} />
                        <YAxis hide allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, padding: '4px 10px' }}
                          formatter={(value, name) => [value, name === "created" ? "Created" : "Resolved"]} />
                        <Area type="monotone" dataKey="created" stroke="#0052CC" strokeWidth={1.5} fill="url(#adminCreatedGrad)" dot={false} name="created" />
                        <Area type="monotone" dataKey="resolved" stroke="#10B981" strokeWidth={1.5} fill="url(#adminResolvedGrad)" dot={false} name="resolved" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </>
                );
              })()}
            </div>

            {/* Urgent Alerts */}
            <div className="col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Urgent Alerts</span>
                </div>
                {showActionStrip && (
                  <span className="text-[10px] bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold px-1.5 py-0.5 rounded-full">
                    {Object.values(stats?.actionStrip ?? {}).reduce((a: number, b) => a + (b as number), 0)}
                  </span>
                )}
              </div>
              <div className="px-3 py-3 space-y-2 flex-1">
                {loading ? (
                  [...Array(3)].map((_, i) => <div key={i} className="h-10 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg" />)
                ) : !showActionStrip ? (
                  <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">All clear — no urgent alerts</span>
                  </div>
                ) : (
                  <>
                    {(stats?.actionStrip.criticalSlaAtRisk ?? 0) > 0 && (
                      <button onClick={() => handleAlertClick('slaAtRisk')}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 transition-colors text-left group">
                        <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-red-700 dark:text-red-400">Critical + SLA at Risk</p>
                          <p className="text-[10px] text-red-500">{stats?.actionStrip.criticalSlaAtRisk} need immediate attention</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-red-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                    {(stats?.actionStrip.slaBreachedCount ?? 0) > 0 && (
                      <button onClick={() => handleAlertClick('slaBreached')}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 transition-colors text-left group">
                        <XCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">SLA Breached</p>
                          <p className="text-[10px] text-orange-500">{stats?.actionStrip.slaBreachedCount} breaches open</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-orange-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                    {(stats?.actionStrip.unrespondedOver24h ?? 0) > 0 && (
                      <button onClick={() => router.push('/tickets?unresponded=true')}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 transition-colors text-left group">
                        <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">No Response &gt;24h</p>
                          <p className="text-[10px] text-amber-500">{stats?.actionStrip.unrespondedOver24h} tickets waiting</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                    {(stats?.actionStrip.unassignedOver4h ?? 0) > 0 && (
                      <button onClick={() => handleAlertClick('unassigned')}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 transition-colors text-left group">
                        <UserX className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Unassigned &gt;4h</p>
                          <p className="text-[10px] text-blue-500">{stats?.actionStrip.unassignedOver4h} tickets unassigned</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>{/* end row 1 */}

          {/* Row 2 — Agent Workload | Customer Health */}
          <div className="grid grid-cols-3 gap-5">
            {/* Agent Workload */}
            <div className="col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Agent Workload</h2>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2 animate-pulse">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-24" />
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredAgents.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No agents assigned</p>
              ) : (
                <div className="space-y-3">
                  {filteredAgents.map(agent => {
                    const initials = (agent.name ?? '?').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
                    const pct = Math.round((agent.open / maxOpen) * 100);
                    const barColor = agentBarColor(agent.open);
                    return (
                      <div key={agent.id} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#0747A6] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{agent.name}</span>
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                              <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400">{agent.open}</span>
                              {agent.critical > 0 && (
                                <span className="text-xs px-1 py-0.5 rounded bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold">
                                  {agent.critical} crit
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Customer Health */}
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
                  {[...Array(4)].map((_, i) => <div key={i} className="h-10 animate-pulse bg-slate-100 dark:bg-slate-800 rounded" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        {['Customer', 'Users', 'Open Issues', 'SLA Breaches', 'CSAT', 'Status'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {filteredCustomers.map(c => (
                        <tr key={c.id} onClick={() => router.push(`/admin/customers?id=${c.id}`)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{c.name}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{c.userCount}</td>
                          <td className="px-4 py-3"><span className={c.openIssues > 0 ? 'text-red-600 font-semibold' : 'text-slate-500 dark:text-slate-400'}>{c.openIssues}</span></td>
                          <td className="px-4 py-3"><span className={c.slaBreaches > 0 ? 'text-amber-600 font-semibold' : 'text-slate-500 dark:text-slate-400'}>{c.slaBreaches}</span></td>
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
                      {filteredCustomers.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No customers match filters</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>{/* end row 2 */}

          {/* Row 3 — Live Activity | Operational Intelligence */}
          <div className="grid grid-cols-3 gap-5">
            {/* Live Activity Feed */}
            <div className="col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Live Activity</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-slate-400">Live</span>
                </div>
              </div>
              <div className="overflow-y-auto px-3 py-2 space-y-0.5" style={{ maxHeight: 320 }}>
                {feedLoading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-2.5 animate-pulse px-1 py-2">
                      <div className="w-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 mt-1.5 flex-shrink-0" />
                      <div className="flex-1 space-y-1">
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
                        className="w-full flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left">
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 leading-snug">{entry.message}</p>
                          <p className="text-[10px] text-slate-400 truncate">{entry.ticketKey ? `${entry.ticketKey} · ` : ''}{entry.sub}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1 mt-0.5">{timeAgo(entry.time)}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Operational Intelligence */}
            <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Bot className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Operational Intelligence</span>
                <span className="text-[10px] text-slate-400 italic ml-auto">Trends · Patterns · Recommendations</span>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-24" />
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                      </div>
                    </div>
                  ))
                ) : (
                  (stats?.aiInsights ?? []).map((insight, i) => (
                    <div key={i} className="flex gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${insightIconBg(insight.type)}`}>
                        {insight.type === 'error' ? <XCircle className="w-4 h-4" /> :
                         insight.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                         <CheckCircle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{insight.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{insight.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>{/* end row 3 */}

        </main>
      </div>
    </div>
  );
}
