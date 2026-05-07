"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, TrendingUp, Users, ShieldCheck, Download,
  BarChart3, RefreshCw, Filter, ArrowUpRight, ArrowDownRight,
  Minus, ShieldAlert, Zap, Target,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import {
  ComposedChart, Area, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine,
} from "recharts";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AnalyticsData {
  volumeByDay: { day: string; created: number; resolved: number; slaBreaches: number }[];
  priorityByDay: { day: string; CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number }[];
  categoryData: { category: string; count: number }[];
  slaByCustomer: { name: string; total: number; compliant: number; breached: number; compliance: number }[];
  leaderboard: { id: string; name: string; role: string; total: number; resolved: number; criticalResolved: number; avgResolutionHrs: number; csat: number }[];
  clients: { id: string; name: string }[];
  agents: { id: string; name: string; role: string }[];
  days: number;
  summary: {
    totalCreated: number; totalResolved: number; netBacklog: number;
    resolutionRate: number; slaBreachedInPeriod: number; overallSlaCompliance: number;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DAYS_OPTIONS = [30, 60, 90];

const CATEGORY_LABELS: Record<string, string> = {
  BUG: "Bug", FEATURE_REQUEST: "Feature Request",
  DATA_ACCURACY: "Data Accuracy", PERFORMANCE: "Performance",
  ACCESS_SECURITY: "Access / Security",
};

const CATEGORY_COLORS = ["#0052CC", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"];

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "#EF4444", HIGH: "#F59E0B", MEDIUM: "#3B82F6", LOW: "#94A3B8",
};

const MEDAL = ["🥇", "🥈", "🥉"];

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildForecast(volumeByDay: AnalyticsData["volumeByDay"], horizon = 7) {
  if (volumeByDay.length < 7) return [];
  const window = volumeByDay.slice(-14);
  const avgCreated = window.reduce((s, d) => s + d.created, 0) / window.length;
  const avgResolved = window.reduce((s, d) => s + d.resolved, 0) / window.length;
  const today = new Date();
  return Array.from({ length: horizon }, (_, i) => {
    const d = new Date(today.getTime() + (i + 1) * 86400000);
    const label = d.toISOString().slice(5, 10);
    return {
      day: label,
      forecastCreated: Math.round(avgCreated),
      forecastResolved: Math.round(avgResolved),
      created: undefined as number | undefined,
      resolved: undefined as number | undefined,
      slaBreaches: undefined as number | undefined,
    };
  });
}

function exportAllCSV(data: AnalyticsData) {
  const sections: string[] = [];

  sections.push("# Issue Volume by Day");
  sections.push("Date,Created,Resolved,SLA Breaches,Net");
  sections.push(...data.volumeByDay.map((d) => `${d.day},${d.created},${d.resolved},${d.slaBreaches},${d.created - d.resolved}`));

  sections.push("\n# Priority Breakdown by Day");
  sections.push("Date,CRITICAL,HIGH,MEDIUM,LOW");
  sections.push(...data.priorityByDay.map((d) => `${d.day},${d.CRITICAL},${d.HIGH},${d.MEDIUM},${d.LOW}`));

  sections.push("\n# Category Breakdown");
  sections.push("Category,Count");
  sections.push(...data.categoryData.map((d) => `${CATEGORY_LABELS[d.category] ?? d.category},${d.count}`));

  sections.push("\n# SLA Compliance by Customer");
  sections.push("Customer,Total,Compliant,Breached,Compliance%");
  sections.push(...data.slaByCustomer.map((d) => `${d.name},${d.total},${d.compliant},${d.breached},${d.compliance}`));

  sections.push("\n# Agent Performance");
  sections.push("Agent,Role,Total Assigned,Resolved,Critical Resolved,Avg Resolution Hrs,CSAT%");
  sections.push(...data.leaderboard.map((a) =>
    `${a.name},${a.role.replace("THREESC_", "")},${a.total},${a.resolved},${a.criticalResolved},${a.avgResolutionHrs},${a.csat}`
  ));

  const csv = sections.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analytics-export-${data.days}d-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SummaryChip({
  label, value, sub, good,
}: { label: string; value: string | number; sub?: string; good?: boolean }) {
  const Icon = good === undefined ? Minus : good ? ArrowUpRight : ArrowDownRight;
  const color = good === undefined ? "text-slate-400" : good ? "text-emerald-600" : "text-red-500";
  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 flex flex-col gap-1">
      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
      <div className="flex items-end gap-1.5">
        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">{value}</span>
        <Icon className={`w-4 h-4 mb-0.5 ${color}`} />
      </div>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

const VolumeTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const get = (key: string) => payload.find((p: any) => p.dataKey === key)?.value ?? 0;
  const created = get("created"); const resolved = get("resolved");
  const sla = get("slaBreaches"); const net = created - resolved;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0052CC]" />
          <span className="text-slate-500">Created</span>
          <span className="ml-auto font-bold">{created}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span className="text-slate-500">Resolved</span>
          <span className="ml-auto font-bold">{resolved}</span>
        </div>
        {sla > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
            <span className="text-slate-500">SLA Breaches</span>
            <span className="ml-auto font-bold text-red-500">{sla}</span>
          </div>
        )}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-1 flex items-center gap-2">
          <span className="text-slate-400">Net</span>
          <span className={`ml-auto font-bold ${net > 0 ? "text-red-500" : "text-emerald-600"}`}>
            {net > 0 ? `+${net}` : net}
          </span>
        </div>
      </div>
    </div>
  );
};

const ForecastTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const get = (key: string) => payload.find((p: any) => p.dataKey === key)?.value;
  const fc = get("forecastCreated"); const fr = get("forecastResolved");
  if (fc == null && fr == null) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg text-xs min-w-[150px]">
      <p className="font-semibold text-slate-500 mb-2">{label} · Forecast</p>
      <div className="space-y-1">
        {fc != null && <div className="flex items-center gap-2"><span className="text-slate-400">Projected created</span><span className="ml-auto font-bold">{fc}</span></div>}
        {fr != null && <div className="flex items-center gap-2"><span className="text-slate-400">Projected resolved</span><span className="ml-auto font-bold">{fr}</span></div>}
      </div>
      <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-100 dark:border-slate-800 pt-1">14-day moving average</p>
    </div>
  );
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [clientId, setClientId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [showForecast, setShowForecast] = useState(false);
  const [showSla, setShowSla] = useState(true);

  const fetchData = useCallback(async (d: number, cId: string, aId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(d) });
      if (cId) params.set('clientId', cId);
      if (aId) params.set('agentId', aId);
      const res = await fetch(`/api/admin/analytics?${params}`);
      if (res.ok) setData(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(days, clientId, agentId); }, []);

  const applyFilter = (d = days, cId = clientId, aId = agentId) => {
    fetchData(d, cId, aId);
  };

  // Build chart data (actual + optional forecast appended)
  const actualData = data?.volumeByDay ?? [];
  const forecastData = showForecast ? buildForecast(actualData) : [];
  const chartData = [
    ...actualData.map((d) => ({ ...d, forecastCreated: undefined, forecastResolved: undefined })),
    ...forecastData,
  ];

  const todayIdx = actualData.length - 1;
  const priorityData = data?.priorityByDay ?? [];

  const selectCls = "text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0052CC]";

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => router.push("/admin")}
                className="text-[#0052CC] dark:text-blue-400 hover:underline font-medium">Admin</button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Platform Analytics</span>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              <button onClick={() => data && exportAllCSV(data)} disabled={!data}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-40">
                <Download className="w-3.5 h-3.5" /> Export all CSV
              </button>
              <button onClick={() => applyFilter()} disabled={loading}
                className="p-1.5 rounded-md text-slate-400 hover:text-[#0052CC] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Filter Bar ──────────────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />

            <select value={clientId} onChange={(e) => { setClientId(e.target.value); applyFilter(days, e.target.value, agentId); }}
              className={selectCls}>
              <option value="">All Customers</option>
              {(data?.clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select value={agentId} onChange={(e) => { setAgentId(e.target.value); applyFilter(days, clientId, e.target.value); }}
              className={selectCls}>
              <option value="">All Agents</option>
              {(data?.agents ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.role.replace("THREESC_", "")})
                </option>
              ))}
            </select>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
              {DAYS_OPTIONS.map((d) => (
                <button key={d} onClick={() => { setDays(d); applyFilter(d, clientId, agentId); }}
                  className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${days === d ? "bg-white dark:bg-slate-700 text-[#0052CC] shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}>
                  {d}d
                </button>
              ))}
            </div>

            {(clientId || agentId) && (
              <button onClick={() => { setClientId(""); setAgentId(""); applyFilter(days, "", ""); }}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-auto">
                Clear filters
              </button>
            )}
          </div>

          {/* ── Summary Chips ────────────────────────────────────────── */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 animate-pulse h-20" />
              ))
            ) : (
              <>
                <SummaryChip label="Total Created" value={data?.summary.totalCreated ?? 0} sub={`in ${days} days`} />
                <SummaryChip label="Total Resolved" value={data?.summary.totalResolved ?? 0} sub="in period" good={(data?.summary.resolutionRate ?? 0) >= 80} />
                <SummaryChip
                  label="Net Backlog"
                  value={data?.summary.netBacklog != null ? (data.summary.netBacklog > 0 ? `+${data.summary.netBacklog}` : data.summary.netBacklog) : 0}
                  sub={(data?.summary.netBacklog ?? 0) > 0 ? "queue growing" : "queue shrinking"}
                  good={(data?.summary.netBacklog ?? 0) <= 0}
                />
                <SummaryChip label="Resolution Rate" value={`${data?.summary.resolutionRate ?? 0}%`}
                  sub={(data?.summary.resolutionRate ?? 0) >= 80 ? "on track" : "needs attention"}
                  good={(data?.summary.resolutionRate ?? 0) >= 80} />
                <SummaryChip label="SLA Breaches" value={data?.summary.slaBreachedInPeriod ?? 0}
                  sub="in period" good={(data?.summary.slaBreachedInPeriod ?? 0) === 0} />
                <SummaryChip label="SLA Compliance" value={`${data?.summary.overallSlaCompliance ?? 0}%`}
                  sub="overall" good={(data?.summary.overallSlaCompliance ?? 100) >= 90} />
              </>
            )}
          </div>

          {/* ── Volume Trend + SLA Overlay ───────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Issue Volume Trend</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Created vs Resolved · {days}d · answers "why is backlog changing?"</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowSla((v) => !v)}
                  className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors ${showSla ? "border-red-300 bg-red-50 text-red-600 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400" : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"}`}>
                  SLA overlay
                </button>
                <button onClick={() => setShowForecast((v) => !v)}
                  className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors ${showForecast ? "border-violet-300 bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-400" : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"}`}>
                  7d forecast
                </button>
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {loading ? (
              <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="analyticsCreatedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0052CC" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0052CC" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="analyticsResolvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                    interval={Math.max(Math.floor(chartData.length / 9) - 1, 0)} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                    allowDecimals={false} width={28} />
                  {showSla && (
                    <YAxis yAxisId="sla" orientation="right" tick={{ fontSize: 9, fill: "#EF4444" }}
                      tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                  )}
                  <Tooltip content={<VolumeTooltip />} />
                  {showForecast && todayIdx >= 0 && (
                    <ReferenceLine x={actualData[todayIdx]?.day} stroke="#8B5CF6"
                      strokeDasharray="4 2" label={{ value: "Today", position: "top", fontSize: 9, fill: "#8B5CF6" }} />
                  )}
                  <Area type="monotone" dataKey="created" stroke="#0052CC" strokeWidth={2.5}
                    fill="url(#analyticsCreatedGrad)" dot={false} name="Created" connectNulls={false} />
                  <Area type="monotone" dataKey="resolved" stroke="#10B981" strokeWidth={2.5}
                    fill="url(#analyticsResolvedGrad)" dot={false} name="Resolved" connectNulls={false} />
                  {showSla && (
                    <Line type="monotone" dataKey="slaBreaches" yAxisId="sla" stroke="#EF4444"
                      strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="SLA Breaches" connectNulls />
                  )}
                  {showForecast && (
                    <>
                      <Line type="monotone" dataKey="forecastCreated" stroke="#0052CC" strokeWidth={1.5}
                        strokeDasharray="5 3" dot={false} name="Forecast Created" connectNulls />
                      <Line type="monotone" dataKey="forecastResolved" stroke="#10B981" strokeWidth={1.5}
                        strokeDasharray="5 3" dot={false} name="Forecast Resolved" connectNulls />
                    </>
                  )}
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                    formatter={(v) => <span className="text-slate-600 dark:text-slate-400">{v}</span>} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
            {showForecast && !loading && (
              <p className="text-[10px] text-slate-400 mt-1 text-right">
                Forecast based on 14-day rolling average — directional only, not a guarantee.
              </p>
            )}
          </div>

          {/* ── Priority Trend ───────────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Issues by Priority Over Time</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Spot spikes in critical/high — pinpoints root-cause periods · {days}d
                </p>
              </div>
              <Target className="w-4 h-4 text-slate-400" />
            </div>
            {loading ? (
              <div className="h-52 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ) : priorityData.every((d) => d.CRITICAL + d.HIGH + d.MEDIUM + d.LOW === 0) ? (
              <div className="h-40 flex items-center justify-center text-sm text-slate-400">No data for this period</div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  {Object.entries(PRIORITY_COLORS).map(([p, color]) => {
                    const total = priorityData.reduce((s, d) => s + (d[p as keyof typeof d] as number), 0);
                    return (
                      <div key={p} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs text-slate-500">{p.charAt(0) + p.slice(1).toLowerCase()}</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">{total}</span>
                      </div>
                    );
                  })}
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={priorityData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                      interval={Math.max(Math.floor(priorityData.length / 9) - 1, 0)} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                      allowDecimals={false} width={28} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                      formatter={(v, n) => [v, String(n).charAt(0) + String(n).slice(1).toLowerCase()]} />
                    <Bar dataKey="CRITICAL" stackId="a" fill={PRIORITY_COLORS.CRITICAL} name="Critical" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="HIGH" stackId="a" fill={PRIORITY_COLORS.HIGH} name="High" />
                    <Bar dataKey="MEDIUM" stackId="a" fill={PRIORITY_COLORS.MEDIUM} name="Medium" />
                    <Bar dataKey="LOW" stackId="a" fill={PRIORITY_COLORS.LOW} name="Low" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          {/* ── Category + SLA Compliance ────────────────────────────── */}
          <div className="grid grid-cols-2 gap-6">

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Issues by Category</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">What types are being raised · {days}d</p>
                </div>
                <BarChart3 className="w-4 h-4 text-slate-400" />
              </div>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-28" />
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-6" />
                    </div>
                  ))}
                </div>
              ) : (data?.categoryData ?? []).length === 0 ? (
                <div className="h-40 flex items-center justify-center text-sm text-slate-400">No data yet</div>
              ) : (
                <>
                  <div className="space-y-3 mb-5">
                    {(data?.categoryData ?? []).map(({ category, count }, i) => {
                      const max = data?.categoryData[0]?.count ?? 1;
                      const pct = Math.round((count / max) * 100);
                      const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                      return (
                        <div key={category} className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 dark:text-slate-400 w-28 shrink-0 truncate">
                            {CATEGORY_LABELS[category] ?? category}
                          </span>
                          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-7 text-right tabular-nums">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart data={data?.categoryData ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                      <XAxis dataKey="category" tick={{ fontSize: 9 }} tickLine={false} axisLine={false}
                        tickFormatter={(v) => CATEGORY_LABELS[v]?.split(" ")[0] ?? v} />
                      <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                        formatter={(v, _n, p) => [v, CATEGORY_LABELS[p.payload.category] ?? p.payload.category]} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {(data?.categoryData ?? []).map((_, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">SLA Compliance by Customer</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Compliant vs Breached · {days}d</p>
                </div>
                <ShieldCheck className="w-4 h-4 text-slate-400" />
              </div>
              {loading ? (
                <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              ) : (data?.slaByCustomer ?? []).length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-slate-400">No data</div>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {(data?.slaByCustomer ?? [])
                      .sort((a, b) => a.compliance - b.compliance)
                      .slice(0, 5)
                      .map((c) => (
                        <div key={c.name} className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 w-24 shrink-0 truncate">{c.name}</span>
                          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                            <div className="h-full bg-emerald-500 transition-all"
                              style={{ width: `${(c.compliant / (c.total || 1)) * 100}%` }} />
                            <div className="h-full bg-red-400 transition-all"
                              style={{ width: `${(c.breached / (c.total || 1)) * 100}%` }} />
                          </div>
                          <span className={`text-xs font-bold w-10 text-right tabular-nums ${c.compliance >= 90 ? "text-emerald-600" : c.compliance >= 70 ? "text-amber-500" : "text-red-500"}`}>
                            {c.compliance}%
                          </span>
                        </div>
                      ))}
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={data?.slaByCustomer ?? []} layout="vertical" margin={{ left: 8, right: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} width={80}
                        tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + "…" : v} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                        formatter={(v, n) => [v, n === "compliant" ? "Compliant" : "Breached"]} />
                      <Bar dataKey="compliant" fill="#10b981" name="compliant" stackId="a" />
                      <Bar dataKey="breached" fill="#ef4444" name="breached" stackId="a" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          </div>

          {/* ── Agent Performance Leaderboard ─────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Agent Performance</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ranked by resolutions · {days}d</p>
              </div>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (data?.leaderboard ?? []).length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No agent data yet</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {(data?.leaderboard ?? []).slice(0, 8).map((agent, idx) => {
                  const initials = agent.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                  const resolveRate = agent.total > 0 ? Math.round((agent.resolved / agent.total) * 100) : 0;
                  return (
                    <div key={agent.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-base w-6 text-center shrink-0 tabular-nums">{MEDAL[idx] ?? `#${idx + 1}`}</span>
                      <div className="w-8 h-8 rounded-full bg-[#0747A6] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{agent.name}</p>
                        <p className="text-[10px] text-slate-400">{agent.role.replace("THREESC_", "")}</p>
                        <div className="mt-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-[#0052CC] rounded-full" style={{ width: `${resolveRate}%` }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-right shrink-0">
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">{agent.resolved}</p>
                          <p className="text-[9px] text-slate-400">resolved</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-amber-600 tabular-nums">{agent.criticalResolved}</p>
                          <p className="text-[9px] text-slate-400">critical</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 tabular-nums">
                            {agent.avgResolutionHrs < 1 ? `${Math.round(agent.avgResolutionHrs * 60)}m` : `${agent.avgResolutionHrs}h`}
                          </p>
                          <p className="text-[9px] text-slate-400">avg</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── AI Feature Adoption ──────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">AI Feature Adoption</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">How agents use AI across the platform</p>
              </div>
              <Zap className="w-4 h-4 text-slate-400" />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Auto-classified", value: 87, stroke: "stroke-blue-500", desc: "of issues classified automatically" },
                { label: "Suggestions accepted", value: 62, stroke: "stroke-emerald-500", desc: "of AI responses used by agents" },
                { label: "KB deflection rate", value: 34, stroke: "stroke-purple-500", desc: "tickets resolved via KB self-service" },
                { label: "Routing accuracy", value: 91, stroke: "stroke-amber-500", desc: "correct first-time routing" },
              ].map(({ label, value, stroke, desc }) => (
                <div key={label} className="text-center p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <div className="relative w-16 h-16 mx-auto mb-3">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor"
                        className="text-slate-200 dark:text-slate-700" strokeWidth="3" />
                      <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3"
                        className={stroke} strokeDasharray={`${value * 0.88} 88`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800 dark:text-slate-200">
                      {value}%
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{desc}</p>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
