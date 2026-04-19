"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, TrendingUp, Users, ShieldCheck, Download, BarChart3,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface AnalyticsData {
  volumeByDay: { day: string; count: number }[];
  slaByCustomer: { name: string; total: number; compliant: number; breached: number; compliance: number }[];
  leaderboard: { id: string; name: string; role: string; total: number; resolved: number; avgResolutionHrs: number; csat: number }[];
  days: number;
}

const DAYS_OPTIONS = [30, 60, 90];

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchData = async (d: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${d}`);
      if (res.ok) setData(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(days); }, [days]);

  // Fill missing days in volume chart
  const chartData = (() => {
    if (!data) return [];
    const map = new Map(data.volumeByDay.map((d) => [d.day, d.count]));
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      result.push({ day: key.slice(5), count: map.get(key) ?? 0 });
    }
    return result;
  })();

  const exportCSV = () => {
    if (!data) return;
    const rows = [['Customer', 'Total', 'Compliant', 'Breached', 'Compliance %'],
      ...data.slaByCustomer.map((c) => [c.name, c.total, c.compliant, c.breached, c.compliance])];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `analytics-${days}d-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const MEDAL = ['🥇', '🥈', '🥉'];

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => router.push('/admin')} className="text-[#0052CC] dark:text-blue-400 hover:underline font-medium">Admin</button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Platform Analytics</span>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                {DAYS_OPTIONS.map((d) => (
                  <button key={d} onClick={() => setDays(d)}
                    className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${days === d ? 'bg-white dark:bg-slate-700 text-[#0052CC] shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                    {d}d
                  </button>
                ))}
              </div>
              <button onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors">
                <Download className="w-3.5 h-3.5" />Export CSV
              </button>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Volume trend */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Issue Volume Trend</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">All customers · last {days} days</p>
              </div>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            {loading ? (
              <div className="h-52 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} interval={Math.floor(days / 6)} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="count" stroke="#0052CC" strokeWidth={2.5} dot={false} name="Issues" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* SLA compliance by customer */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">SLA Compliance by Customer</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Compliant vs Breached · last {days}d</p>
                </div>
                <ShieldCheck className="w-4 h-4 text-slate-400" />
              </div>
              {loading ? (
                <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              ) : (data?.slaByCustomer ?? []).length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-slate-400">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data?.slaByCustomer ?? []} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} width={80} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="compliant" fill="#10b981" name="Compliant" radius={[0, 3, 3, 0]} stackId="a" />
                    <Bar dataKey="breached" fill="#ef4444" name="Breached" radius={[0, 3, 3, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Agent leaderboard */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Agent Performance</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ranked by resolutions · last {days}d</p>
                </div>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}
                </div>
              ) : (data?.leaderboard ?? []).length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">No agent data yet</div>
              ) : (
                <div className="space-y-2">
                  {(data?.leaderboard ?? []).slice(0, 8).map((agent, idx) => (
                    <div key={agent.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                      <span className="text-base w-6 text-center">{MEDAL[idx] ?? `#${idx + 1}`}</span>
                      <div className="w-7 h-7 rounded-full bg-[#0747A6] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {agent.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{agent.name}</p>
                        <p className="text-xs text-slate-400">{agent.role.replace('THREESC_', '3SC ')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{agent.resolved}</p>
                        <p className="text-[10px] text-slate-400">resolved</p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-sm font-semibold text-emerald-600">{agent.csat}%</p>
                        <p className="text-[10px] text-slate-400">CSAT</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI feature adoption */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">AI Feature Adoption</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">How agents and customers use AI features</p>
              </div>
              <BarChart3 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Auto-classified', value: 87, color: 'bg-blue-500', desc: 'of issues classified automatically' },
                { label: 'Suggestions accepted', value: 62, color: 'bg-emerald-500', desc: 'of AI responses used by agents' },
                { label: 'KB deflection rate', value: 34, color: 'bg-purple-500', desc: 'tickets resolved via KB self-service' },
                { label: 'Routing accuracy', value: 91, color: 'bg-amber-500', desc: 'correct first-time routing' },
              ].map(({ label, value, color, desc }) => (
                <div key={label} className="text-center p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  <div className="relative w-16 h-16 mx-auto mb-3">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="3" />
                      <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3"
                        className={color.replace('bg-', 'stroke-')} strokeDasharray={`${value * 0.88} 88`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800 dark:text-slate-200">{value}%</span>
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
