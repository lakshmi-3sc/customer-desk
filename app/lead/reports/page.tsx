"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Download, BarChart3, RefreshCw } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const DAYS_OPTIONS = [30, 60, 90];

interface AnalyticsData {
  volumeByDay: { day: string; count: number }[];
  slaByCustomer: { name: string; total: number; compliant: number; breached: number; compliance: number }[];
  leaderboard: { id: string; name: string; role: string; total: number; resolved: number; avgResolutionHrs: number; csat: number }[];
}

const TABS = ["Volume Trend", "SLA Compliance", "Resolution Time", "CSAT", "Agent Performance"];

export default function LeadReportsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState("Volume Trend");

  const fetchData = async (d: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${d}`);
      if (res.ok) setData(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(days); }, [days]);

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

  // Mock CSAT + resolution trend
  const csatTrend = Array.from({ length: 8 }, (_, i) => ({
    week: `W${i + 1}`,
    csat: Math.floor(Math.random() * 20) + 75,
    target: 85,
  }));
  const resolutionTrend = Array.from({ length: 8 }, (_, i) => ({
    week: `W${i + 1}`,
    avgHrs: Math.floor(Math.random() * 12) + 8,
  }));

  const exportCSV = () => {
    const rows = [["Customer", "SLA Total", "Compliant", "Breached", "Compliance %"],
      ...(data?.slaByCustomer ?? []).map((c) => [c.name, c.total, c.compliant, c.breached, c.compliance])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `lead-report-${days}d-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => router.push("/dashboard")} className="text-[#0052CC] dark:text-blue-400 hover:underline font-medium">Lead</button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Reports</span>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                {DAYS_OPTIONS.map((d) => (
                  <button key={d} onClick={() => setDays(d)}
                    className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${days === d ? "bg-white dark:bg-slate-700 text-[#0052CC] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    {d}d
                  </button>
                ))}
              </div>
              <button onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors">
                <Download className="w-3.5 h-3.5" />Export CSV
              </button>
              <button onClick={() => fetchData(days)} className="p-1.5 rounded-md text-slate-400 hover:text-[#0052CC] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          }
        />

        <div className="px-6 pt-4 flex gap-1 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-xs px-3 py-2.5 font-medium border-b-2 transition-colors ${tab === t ? "border-[#0052CC] text-[#0052CC]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {t}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4">{[...Array(2)].map((_, i) => <div key={i} className="h-56 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse" />)}</div>
          ) : (
            <div className="space-y-6">
              {tab === "Volume Trend" && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Issue Volume Trend</h3>
                  <p className="text-xs text-slate-500 mb-4">All customers · last {days} days</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} interval={Math.floor(days / 6)} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Line type="monotone" dataKey="count" stroke="#0052CC" strokeWidth={2.5} dot={false} name="Issues" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {tab === "SLA Compliance" && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">SLA Compliance by Customer</h3>
                  <p className="text-xs text-slate-500 mb-4">Compliant vs Breached · last {days}d</p>
                  {(data?.slaByCustomer ?? []).length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-sm text-slate-400">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={data?.slaByCustomer ?? []} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} width={90} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          formatter={(v, name) => [`${v}`, `${name}`]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="compliant" fill="#10b981" name="Compliant" stackId="a" radius={[0, 3, 3, 0]} />
                        <Bar dataKey="breached" fill="#ef4444" name="Breached" stackId="a" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}

              {tab === "Resolution Time" && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Avg Resolution Time Trend</h3>
                  <p className="text-xs text-slate-500 mb-4">Weekly averages (hours)</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={resolutionTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v}h`, "Avg Resolution"]} />
                      <Line type="monotone" dataKey="avgHrs" stroke="#8b5cf6" strokeWidth={2.5} dot={false} name="Avg Hrs" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {tab === "CSAT" && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">CSAT by Week</h3>
                  <p className="text-xs text-slate-500 mb-4">Customer satisfaction score vs target (85%)</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={csatTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v}%`]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="csat" stroke="#10b981" strokeWidth={2.5} dot={false} name="CSAT %" />
                      <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="Target" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {(data?.slaByCustomer ?? []).slice(0, 3).map((c, i) => (
                      <div key={c.name} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{c.name}</p>
                        <p className="text-lg font-black text-emerald-600">{c.compliance}%</p>
                        <p className="text-[10px] text-slate-400">CSAT approx.</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "Agent Performance" && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Agent Leaderboard</h3>
                  {(data?.leaderboard ?? []).length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">No agent data</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={(data?.leaderboard ?? []).slice(0, 6)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="resolved" fill="#0052CC" name="Resolved" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="total" fill="#e2e8f0" name="Assigned" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="mt-4 space-y-2">
                        {(data?.leaderboard ?? []).map((agent, idx) => (
                          <div key={agent.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                            <span className="text-sm w-6 text-center">{["🥇", "🥈", "🥉"][idx] ?? `#${idx + 1}`}</span>
                            <div className="w-6 h-6 rounded-full bg-[#0747A6] text-white flex items-center justify-center text-[10px] font-bold">
                              {agent.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{agent.name}</p>
                            </div>
                            <div className="flex gap-4 text-center">
                              <div><p className="text-sm font-bold text-slate-800 dark:text-slate-200">{agent.resolved}</p><p className="text-[9px] text-slate-400">resolved</p></div>
                              <div><p className="text-sm font-bold text-emerald-600">{agent.csat}%</p><p className="text-[9px] text-slate-400">CSAT</p></div>
                              <div><p className="text-sm font-bold text-blue-600">{agent.avgResolutionHrs}h</p><p className="text-[9px] text-slate-400">avg</p></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
