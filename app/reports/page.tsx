"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, ShieldCheck, Clock, Download, RefreshCw,
  BarChart2, AlertCircle,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#3b82f6",
};

const CATEGORY_COLORS = [
  "#0052CC", "#0747A6", "#36B37E", "#FF8B00", "#6554C0", "#FF5630",
];

interface ReportsData {
  weeklyVolume: { week: string; created: number; resolved: number }[];
  priorityBreakdown: { priority: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  slaCompliance: number;
  avgResolutionDays: number;
}

function exportCSV(data: ReportsData) {
  const rows = [
    ["Week", "Created", "Resolved"],
    ...data.weeklyVolume.map((w) => [w.week, w.created, w.resolved]),
    [],
    ["Priority", "Count"],
    ...data.priorityBreakdown.map((p) => [p.priority, p.count]),
    [],
    ["Category", "Count"],
    ...data.categoryBreakdown.map((c) => [c.category, c.count]),
    [],
    ["SLA Compliance %", data.slaCompliance],
    ["Avg Resolution (days)", data.avgResolutionDays],
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const router = useRouter();
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/reports");
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">Reports</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Analytics & Insights</p>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
              {data && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportCSV(data)}
                  className="h-7 text-xs gap-1.5"
                >
                  <Download className="w-3 h-3" />
                  Export CSV
                </Button>
              )}
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Summary KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Issues (8 wks)",
                  value: loading ? "—" : (data?.weeklyVolume.reduce((s, w) => s + w.created, 0) ?? 0),
                  icon: BarChart2,
                  color: "text-blue-600",
                  border: "border-l-blue-500",
                },
                {
                  label: "Resolved (8 wks)",
                  value: loading ? "—" : (data?.weeklyVolume.reduce((s, w) => s + w.resolved, 0) ?? 0),
                  icon: TrendingUp,
                  color: "text-emerald-600",
                  border: "border-l-emerald-500",
                },
                {
                  label: "SLA Compliance",
                  value: loading ? "—" : `${data?.slaCompliance ?? 0}%`,
                  icon: ShieldCheck,
                  color: "text-purple-600",
                  border: "border-l-purple-500",
                },
                {
                  label: "Avg Resolution",
                  value: loading ? "—" : `${data?.avgResolutionDays ?? 0}d`,
                  icon: Clock,
                  color: "text-orange-600",
                  border: "border-l-orange-500",
                },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div
                    key={i}
                    className={`bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 border-l-4 ${card.border} p-4`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {card.label}
                      </p>
                      <Icon className={`w-4 h-4 ${card.color} opacity-60`} />
                    </div>
                    {loading ? (
                      <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    ) : (
                      <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Issue Volume Bar Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Issue Volume — Last 8 Weeks
              </h2>
              {loading ? (
                <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.weeklyVolume} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#1e293b",
                        border: "none",
                        borderRadius: "6px",
                        color: "#f8fafc",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                    />
                    <Bar dataKey="created" name="Created" fill="#0052CC" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="resolved" name="Resolved" fill="#36B37E" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Priority Breakdown Pie */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Issues by Priority
                </h2>
                {loading ? (
                  <div className="h-56 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data?.priorityBreakdown.filter((p) => p.count > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="priority"
                        label={({ priority, percent }) =>
                          `${priority} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {data?.priorityBreakdown.map((entry, index) => (
                          <Cell
                            key={entry.priority}
                            fill={PRIORITY_COLORS[entry.priority] ?? "#94a3b8"}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#1e293b",
                          border: "none",
                          borderRadius: "6px",
                          color: "#f8fafc",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* SLA Compliance + Avg Resolution */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      SLA Compliance
                    </h2>
                    {!loading && (
                      <span
                        className={`text-lg font-bold ${
                          (data?.slaCompliance ?? 0) >= 90
                            ? "text-emerald-600"
                            : (data?.slaCompliance ?? 0) >= 70
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {data?.slaCompliance ?? 0}%
                      </span>
                    )}
                  </div>
                  {loading ? (
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  ) : (
                    <Progress value={data?.slaCompliance ?? 0} className="h-3" />
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    Percentage of resolved issues that met SLA targets
                  </p>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    Category Breakdown
                  </p>
                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {data?.categoryBreakdown
                        .filter((c) => c.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .map((cat, i) => {
                          const total = data.categoryBreakdown.reduce((s, c) => s + c.count, 0);
                          const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0;
                          return (
                            <div key={cat.category} className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                              />
                              <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 capitalize">
                                {cat.category.toLowerCase()}
                              </span>
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                {cat.count}
                              </span>
                              <span className="text-xs text-slate-400 w-8 text-right">
                                {pct}%
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {!loading && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center gap-3">
                    <Clock className="w-8 h-8 text-orange-500 flex-shrink-0" />
                    <div>
                      <p className="text-2xl font-bold text-orange-600">
                        {data?.avgResolutionDays ?? 0}d
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Average resolution time
                      </p>
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
