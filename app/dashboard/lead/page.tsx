"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, Clock, ShieldAlert, ArrowUpRight, RefreshCw,
  Bot, Users, UserX, Flame, TrendingUp, CheckCircle, ChevronRight,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import type { LucideIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentLoad {
  id: string;
  name: string;
  open: number;
  critical: number;
  overdue: number;
  loadPct: number;
  overloaded: boolean;
}

interface QueueTicket {
  id: string;
  ticketKey: string | null;
  title: string;
  priority: string;
  status: string;
  reason: "escalated" | "sla_risk" | "unassigned" | "overdue";
  client: { name: string };
  assignedTo: { name: string } | null;
  slaDueAt: string | null;
  createdAt: string;
}

interface Stats {
  kpis: {
    needsAssignment: number;
    slaRisk: number;
    escalated: number;
    overloadedAgents: number;
    customerRisk: number;
  };
  priorityQueue: QueueTicket[];
  agentLoad: AgentLoad[];
  recentEscalations: {
    id: string; ticketKey: string | null; title: string; priority: string;
    escalatedAt: string; assignedTo: { name: string } | null; client: { name: string };
  }[];
  aiStats: { routedToday: number; needsReview: number };
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function slaCountdown(iso: string | null) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) {
    const over = Math.abs(diff);
    const h = Math.floor(over / 3600000);
    const m = Math.floor((over % 3600000) / 60000);
    return { label: h >= 1 ? `${h}h over` : `${m}m over`, breached: true };
  }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return { label: h >= 1 ? `${h}h left` : `${m}m left`, breached: false };
}

const PRIORITY_PILL: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900",
  HIGH:     "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900",
  MEDIUM:   "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900",
  LOW:      "bg-slate-100 text-slate-600 dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
};

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH:     "bg-amber-500",
  MEDIUM:   "bg-blue-400",
  LOW:      "bg-slate-400",
};

const REASON_PILL: Record<string, { label: string; cls: string }> = {
  escalated: { label: "Escalated",  cls: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border-red-100 dark:border-red-900" },
  sla_risk:  { label: "SLA Risk",   cls: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-100 dark:border-amber-900" },
  unassigned:{ label: "Unassigned", cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700" },
  overdue:   { label: "Overdue",    cls: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 border-orange-100 dark:border-orange-900" },
};

// ─── KPI Card (matches admin pattern exactly) ──────────────────────────────────

interface KpiProps {
  label: string;
  value: number;
  sub: string;
  icon: LucideIcon;
  accentColor: string;
  iconColor: string;
  urgent?: boolean;
  onClick?: () => void;
}

function KpiCard({ label, value, sub, icon: Icon, accentColor, iconColor, urgent, onClick }: KpiProps) {
  return (
    <div
      onClick={onClick}
      className={`group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 border-l-[3px] ${accentColor} shadow-sm ${onClick ? "cursor-pointer hover:shadow-md transition-all duration-150" : ""}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">{label}</p>
        <div className={`p-1 rounded-md ${iconColor}`}>
          <Icon className="w-3 h-3" />
        </div>
      </div>
      <p className={`text-[22px] font-bold tabular-nums leading-none ${urgent && value > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-50"}`}>
        {value}
      </p>
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function LeadDashboard() {
  const router = useRouter();
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const kpis = data?.kpis;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F8F9FB] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div>
              <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Lead Command Center</h1>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Live team operations</p>
            </div>
          }
          right={undefined}
        />

        <main className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── KPI Action Cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-5 gap-3">
            {loading ? [...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border-l-[3px] border-l-slate-200 border border-slate-200 dark:border-slate-800 px-4 py-3 animate-pulse">
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-20 mb-3" />
                <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-10 mb-2" />
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-16" />
              </div>
            )) : (
              <>
                <KpiCard
                  label="Needs Assignment"
                  value={kpis?.needsAssignment ?? 0}
                  sub="unassigned open tickets"
                  icon={UserX}
                  accentColor="border-l-slate-400"
                  iconColor="bg-slate-100 dark:bg-slate-800 text-slate-500"
                  urgent={true}
                  onClick={() => router.push("/tickets?unassigned=true")}
                />
                <KpiCard
                  label="SLA Risk"
                  value={kpis?.slaRisk ?? 0}
                  sub="at risk or breached"
                  icon={Clock}
                  accentColor="border-l-amber-400"
                  iconColor="bg-amber-50 dark:bg-amber-950/40 text-amber-500"
                  urgent={true}
                  onClick={() => router.push("/tickets?slaAtRisk=true")}
                />
                <KpiCard
                  label="Escalated"
                  value={kpis?.escalated ?? 0}
                  sub="need lead action"
                  icon={ShieldAlert}
                  accentColor="border-l-red-500"
                  iconColor="bg-red-50 dark:bg-red-950/40 text-red-500"
                  urgent={true}
                  onClick={() => router.push("/lead/escalations")}
                />
                <KpiCard
                  label="Overloaded Agents"
                  value={kpis?.overloadedAgents ?? 0}
                  sub="above 8 open tickets"
                  icon={Users}
                  accentColor="border-l-orange-400"
                  iconColor="bg-orange-50 dark:bg-orange-950/40 text-orange-500"
                  urgent={true}
                  onClick={() => router.push("/lead/workload")}
                />
                <KpiCard
                  label="Customer Risk"
                  value={kpis?.customerRisk ?? 0}
                  sub="2+ critical open issues"
                  icon={Flame}
                  accentColor="border-l-rose-500"
                  iconColor="bg-rose-50 dark:bg-rose-950/40 text-rose-500"
                  urgent={true}
                />
              </>
            )}
          </div>

          {/* ── Today's Priority Queue ───────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Priority Queue</h3>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">— tickets needing your action now</span>
                {!loading && data && data.priorityQueue.length > 0 && (
                  <span className="ml-1 text-[11px] px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-full font-semibold">
                    {data.priorityQueue.length}
                  </span>
                )}
              </div>
              <button onClick={() => router.push("/tickets")} className="flex items-center gap-0.5 text-xs text-[#0052CC] dark:text-blue-400 hover:underline font-medium">
                All tickets <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-center gap-4 animate-pulse">
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-20 flex-shrink-0" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded flex-1" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-16 flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : !data || data.priorityQueue.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle className="w-9 h-9 mx-auto mb-2.5 text-emerald-400" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">All clear — no tickets need immediate action</p>
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div className="px-5 py-2 grid grid-cols-[160px_minmax(0,1fr)_90px_110px_100px_72px] gap-3 border-b border-slate-50 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-800/30">
                  {["Ticket", "Summary", "Reason", "Customer", "Assigned", "SLA"].map((h) => (
                    <p key={h} className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{h}</p>
                  ))}
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {data.priorityQueue.map((ticket) => {
                    const reason = REASON_PILL[ticket.reason] ?? REASON_PILL.unassigned;
                    const sla = slaCountdown(ticket.slaDueAt);
                    return (
                      <div
                        key={ticket.id}
                        onClick={() => router.push(`/tickets/${ticket.ticketKey ?? ticket.id}`)}
                        className="px-5 h-10 grid grid-cols-[160px_minmax(0,1fr)_90px_110px_100px_72px] gap-3 items-center hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                      >
                        {/* Priority dot + ticket key — single line */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[ticket.priority] ?? "bg-slate-400"}`} />
                          <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                            {ticket.ticketKey ?? ticket.id.slice(0, 8)}
                          </span>
                        </div>
                        {/* Title */}
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-[#0052CC] dark:group-hover:text-blue-400 transition-colors">
                          {ticket.title}
                        </p>
                        {/* Reason badge */}
                        <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded border ${reason.cls} w-fit`}>
                          {reason.label}
                        </span>
                        {/* Customer */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{ticket.client.name}</p>
                        {/* Assigned */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {ticket.assignedTo?.name ?? <span className="text-slate-300 dark:text-slate-600 italic">Unassigned</span>}
                        </p>
                        {/* SLA */}
                        {sla ? (
                          <p className={`text-[11px] font-semibold tabular-nums whitespace-nowrap ${sla.breached ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                            {sla.label}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-300 dark:text-slate-600">—</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ── Agent Load Balancer + Right Panel ───────────────────────── */}
          <div className="grid grid-cols-3 gap-5">

            {/* Agent Load Balancer */}
            <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Agent Load Balancer</h3>
                </div>
                <button onClick={() => router.push("/lead/workload")} className="flex items-center gap-0.5 text-xs text-[#0052CC] dark:text-blue-400 hover:underline font-medium">
                  Full workload <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              {loading ? (
                <div className="p-5 space-y-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}
                </div>
              ) : !data || data.agentLoad.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">No agents found</div>
              ) : (
                <div className="p-5 space-y-3.5">
                  {data.agentLoad
                    .sort((a, b) => b.open - a.open)
                    .map((agent) => {
                      const barColor = agent.open >= 15 ? "#EF4444" : agent.open >= 8 ? "#F59E0B" : "#10B981";
                      return (
                        <div key={agent.id} className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#0747A6] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
                            {agent.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
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
                              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${agent.loadPct}%`, backgroundColor: barColor }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4">

              {/* Escalation alerts */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Escalations</h3>
                  </div>
                  <button onClick={() => router.push("/lead/escalations")} className="text-xs text-[#0052CC] dark:text-blue-400 hover:underline flex items-center gap-0.5 font-medium">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="p-3">
                  {loading ? (
                    <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
                  ) : (data?.recentEscalations ?? []).length === 0 ? (
                    <div className="py-6 text-center">
                      <CheckCircle className="w-6 h-6 mx-auto mb-1.5 text-emerald-400" />
                      <p className="text-xs text-slate-400">No active escalations</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {(data?.recentEscalations ?? []).slice(0, 4).map((esc) => (
                        <button
                          key={esc.id}
                          onClick={() => router.push(`/tickets/${esc.ticketKey ?? esc.id}`)}
                          className="w-full text-left p-2.5 rounded-lg border border-red-100 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors group"
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                            <span className="text-[11px] font-mono font-semibold text-slate-500">{esc.ticketKey ?? esc.id.slice(0, 8)}</span>
                            <span className={`ml-auto text-[10px] px-1 py-0.5 rounded font-semibold ${PRIORITY_PILL[esc.priority]}`}>{esc.priority[0]}</span>
                          </div>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">
                            {esc.title}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{esc.client.name} · {timeAgo(esc.escalatedAt)}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Routing */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-800/40 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/40">
                    <Bot className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI Routing</h3>
                </div>
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4 animate-pulse" />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Routed today</p>
                      <p className="text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">{data?.aiStats.routedToday ?? 0}</p>
                    </div>
                    {(data?.aiStats.needsReview ?? 0) > 0 && (
                      <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-100 dark:border-amber-900">
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Needs review</p>
                        <span className="text-[11px] font-bold tabular-nums text-amber-700 dark:text-amber-400">{data?.aiStats.needsReview}</span>
                      </div>
                    )}
                    {(data?.aiStats.needsReview ?? 0) === 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">All routed correctly</p>
                      </div>
                    )}
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
