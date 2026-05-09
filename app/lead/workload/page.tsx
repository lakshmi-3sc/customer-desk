"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Users,
  RefreshCw,
  ShieldAlert,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Play,
  ArrowRight,
  ArrowRightLeft,
  Clock,
  Zap,
  UserCheck,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentIssue {
  id: string;
  ticketKey: string | null;
  title: string;
  priority: string;
  status: string;
  slaDueAt: string | null;
  slaBreached: boolean;
  slaBreachRisk: boolean;
  escalated: boolean;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string };
  isOverdue: boolean;
  isSlaRisk: boolean;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  assigned: number;
  overdue: number;
  critical: number;
  slaRisk: number;
  capacityPct: number;
  capacityMax: number;
  status: "available" | "busy" | "overloaded";
  issues: AgentIssue[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-amber-500",
  MEDIUM: "bg-blue-400",
  LOW: "bg-slate-400",
};

const PRIORITY_LABEL: Record<string, string> = {
  CRITICAL: "text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
  HIGH: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900",
  MEDIUM: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
  LOW: "text-slate-600 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "text-red-600 bg-red-50 dark:bg-red-950/30",
  ACKNOWLEDGED: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  IN_PROGRESS: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
  RESOLVED: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
  CLOSED: "text-slate-500 bg-slate-100 dark:bg-slate-800",
};

const STATUS_BADGE: Record<Agent["status"], { label: string; cls: string }> = {
  available: { label: "Available", cls: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900" },
  busy: { label: "Busy", cls: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900" },
  overloaded: { label: "Overloaded", cls: "text-red-700 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ageLabel(isoDate: string) {
  const ms = Date.now() - new Date(isoDate).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "<1h";
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Heuristic: pick the best reassignment target for a ticket from overloaded agent */
function suggestTarget(
  agents: Agent[],
  fromAgentId: string,
  issue: AgentIssue
): { agent: Agent; reason: string } | null {
  const candidates = agents
    .filter((a) => a.id !== fromAgentId && a.assigned < a.capacityMax)
    .sort((a, b) => {
      // Prefer fewer overdue, then fewer assigned
      const overdueScore = a.overdue - b.overdue;
      if (overdueScore !== 0) return overdueScore;
      return a.assigned - b.assigned;
    });

  if (candidates.length === 0) return null;
  const best = candidates[0];
  const reason =
    best.overdue === 0 && best.assigned <= 4
      ? `Low workload (${best.assigned} open, 0 overdue)`
      : `Lightest available (${best.assigned} open, ${best.overdue} overdue)`;
  return { agent: best, reason };
}

function suggestedLeadAction(agent: Agent): string {
  if (agent.status === "overloaded") {
    const actionable = agent.overdue + agent.critical;
    return `Pause routing and reassign ${actionable > 0 ? actionable : agent.assigned} ${actionable > 0 ? "overdue/critical" : "open"} tickets`;
  }
  if (agent.overdue > 0) return `Review ${agent.overdue} overdue ticket${agent.overdue > 1 ? "s" : ""} and consider reassignment`;
  if (agent.slaRisk > 0) return `Monitor ${agent.slaRisk} SLA-at-risk ticket${agent.slaRisk > 1 ? "s" : ""}`;
  return "Agent workload is healthy";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AgentCard({
  agent,
  selected,
  routingPaused,
  onSelect,
  onToggleRouting,
}: {
  agent: Agent;
  selected: boolean;
  routingPaused: boolean;
  onSelect: () => void;
  onToggleRouting: (e: React.MouseEvent) => void;
}) {
  const badge = STATUS_BADGE[agent.status];
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-4 transition-all ${
        selected
          ? "border-[#0052CC] bg-blue-50/60 dark:bg-blue-950/20 shadow-sm"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
      }`}
    >
      {/* Row 1: Avatar + name + badges */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-[#0747A6] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
          {initials(agent.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
            {agent.name}
          </p>
          <p className="text-[11px] text-slate-400 truncate">{agent.email}</p>
        </div>
        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>

      {/* Row 2: stats */}
      <div className="flex items-center gap-4 mb-3 text-center">
        <div>
          <p className="text-base font-black text-slate-800 dark:text-slate-200">
            {agent.assigned}
          </p>
          <p className="text-[10px] text-slate-400">Open</p>
        </div>
        <div>
          <p
            className={`text-base font-black ${
              agent.overdue > 0 ? "text-red-600" : "text-slate-300 dark:text-slate-600"
            }`}
          >
            {agent.overdue}
          </p>
          <p className="text-[10px] text-slate-400">Overdue</p>
        </div>
        {agent.critical > 0 && (
          <div>
            <p className="text-base font-black text-red-500">{agent.critical}</p>
            <p className="text-[10px] text-slate-400">Critical</p>
          </div>
        )}
        {agent.slaRisk > 0 && (
          <div>
            <p className="text-base font-black text-amber-500">{agent.slaRisk}</p>
            <p className="text-[10px] text-slate-400">SLA Risk</p>
          </div>
        )}
        <div className="flex-1" />
        {/* Auto-routing toggle */}
        <button
          onClick={onToggleRouting}
          title={routingPaused ? "Resume auto-routing" : "Pause auto-routing"}
          className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border transition-colors ${
            routingPaused
              ? "border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:border-emerald-400 hover:text-emerald-600"
              : "border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:border-red-300 hover:text-red-600"
          }`}
        >
          {routingPaused ? (
            <>
              <Play className="w-2.5 h-2.5" /> Paused
            </>
          ) : (
            <>
              <Zap className="w-2.5 h-2.5" /> Routing
            </>
          )}
        </button>
      </div>

      {/* Capacity bar */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
          <span>Capacity</span>
          <span>
            {agent.assigned}/{agent.capacityMax}
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              agent.status === "overloaded"
                ? "bg-red-500"
                : agent.status === "busy"
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${agent.capacityPct}%` }}
          />
        </div>
      </div>
    </button>
  );
}

function SlaStateChip({ issue }: { issue: AgentIssue }) {
  if (issue.isOverdue)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-1.5 py-0.5 rounded">
        <ShieldAlert className="w-2.5 h-2.5" /> Overdue
      </span>
    );
  if (issue.isSlaRisk)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-1.5 py-0.5 rounded">
        <AlertTriangle className="w-2.5 h-2.5" /> SLA Risk
      </span>
    );
  if (issue.escalated)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 px-1.5 py-0.5 rounded">
        <ArrowRight className="w-2.5 h-2.5" /> Escalated
      </span>
    );
  return (
    <span className="text-[10px] text-slate-400">
      <Clock className="w-2.5 h-2.5 inline mr-0.5" />
      {issue.slaDueAt ? ageLabel(issue.slaDueAt) : "—"}
    </span>
  );
}

function recAction(issue: AgentIssue): string {
  if (issue.isOverdue) return "Reassign";
  if (issue.isSlaRisk) return "Reassign";
  if (issue.escalated) return "Open";
  if (issue.priority === "CRITICAL") return "Reassign";
  return "Open";
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkloadBalancerPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Per-agent routing pause state (local UI — wire to API when ready)
  const [pausedRouting, setPausedRouting] = useState<Record<string, boolean>>({});

  // Reassign state
  const [reassigning, setReassigning] = useState<{
    issue: AgentIssue;
    agentId: string;
    suggestedAgentId: string | null;
    reason: string | null;
  } | null>(null);
  const [targetAgentId, setTargetAgentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lead/workload");
      if (res.ok) {
        const data = await res.json();
        const loaded: Agent[] = data.agents ?? [];
        setAgents(loaded);
        setSelectedAgentId((prev) => prev ?? loaded[0]?.id ?? null);
      }
    } catch {
      // silently fail — stale data stays visible
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null;

  const handleReassign = async () => {
    if (!reassigning || !targetAgentId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/dashboard/tickets/${reassigning.issue.id}/update`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignedToId: targetAgentId }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.error ?? "Reassignment failed");
        return;
      }
      setReassigning(null);
      setTargetAgentId("");
      await load();
    } catch {
      setSaveError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  };

  const openReassignModal = (issue: AgentIssue, agentId: string) => {
    const suggestion = suggestTarget(agents, agentId, issue);
    setReassigning({
      issue,
      agentId,
      suggestedAgentId: suggestion?.agent.id ?? null,
      reason: suggestion?.reason ?? null,
    });
    setTargetAgentId(suggestion?.agent.id ?? "");
    setSaveError(null);
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F8F9FB] dark:bg-slate-950">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar
          left={
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-[#0052CC] dark:text-blue-400 hover:underline font-medium"
              >
                Lead
              </button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                Workload Balancer
              </span>
            </div>
          }
          right={undefined}
        />

        {/* ── Two-column workspace ─────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: agent list */}
          <div className="w-80 xl:w-96 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-4 space-y-2.5 bg-white dark:bg-slate-900/50">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Agents
              </p>
              <p className="text-[11px] text-slate-400">
                {agents.length} active
              </p>
            </div>

            {loading ? (
              [...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 animate-pulse"
                />
              ))
            ) : agents.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-400">No active agents</p>
              </div>
            ) : (
              agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  selected={selectedAgentId === agent.id}
                  routingPaused={!!pausedRouting[agent.id]}
                  onSelect={() =>
                    setSelectedAgentId(
                      selectedAgentId === agent.id ? null : agent.id
                    )
                  }
                  onToggleRouting={(e) => {
                    e.stopPropagation();
                    setPausedRouting((prev) => ({
                      ...prev,
                      [agent.id]: !prev[agent.id],
                    }));
                  }}
                />
              ))
            )}
          </div>

          {/* RIGHT: detail panel */}
          <div className="flex-1 overflow-y-auto p-6 min-w-0">
            {!selectedAgent ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <UserCheck className="w-10 h-10 mb-3 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">
                  Select an agent to inspect their queue
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Click any agent card on the left
                </p>
              </div>
            ) : (
              <AgentDetailPanel
                agent={selectedAgent}
                allAgents={agents}
                routingPaused={!!pausedRouting[selectedAgent.id]}
                onToggleRouting={() =>
                  setPausedRouting((prev) => ({
                    ...prev,
                    [selectedAgent.id]: !prev[selectedAgent.id],
                  }))
                }
                onReassign={(issue) =>
                  openReassignModal(issue, selectedAgent.id)
                }
                onEscalate={(issue) => {
                  const key = issue.ticketKey ?? issue.id;
                  window.open(`/tickets/${key}`, "_blank");
                }}
                onOpen={(issue) => {
                  const key = issue.ticketKey ?? issue.id;
                  window.open(`/tickets/${key}`, "_blank");
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Reassign modal ────────────────────────────────────────── */}
      {reassigning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Reassign Ticket
            </h3>
            <p className="text-xs text-slate-500 mb-4 truncate">
              {reassigning.issue.ticketKey && (
                <span className="font-mono mr-1.5 text-slate-400">
                  {reassigning.issue.ticketKey}
                </span>
              )}
              {reassigning.issue.title}
            </p>

            {/* Suggested agent banner */}
            {reassigning.suggestedAgentId && reassigning.reason && (
              <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg px-3 py-2.5 mb-4">
                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-blue-700 dark:text-blue-300">
                    Suggested:{" "}
                    {agents.find((a) => a.id === reassigning.suggestedAgentId)
                      ?.name ?? "—"}
                  </p>
                  <p className="text-blue-600 dark:text-blue-400">
                    {reassigning.reason}
                  </p>
                </div>
              </div>
            )}

            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              Assign to
            </label>
            <select
              value={targetAgentId}
              onChange={(e) => setTargetAgentId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0052CC] mb-1 text-slate-800 dark:text-slate-200"
            >
              <option value="">Select agent…</option>
              {agents
                .filter((a) => a.id !== reassigning.agentId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.assigned} open
                    {a.assigned >= a.capacityMax ? " (full)" : ""}
                    {a.overdue > 0 ? `, ${a.overdue} overdue` : ""}
                  </option>
                ))}
            </select>

            {saveError && (
              <p className="text-xs text-red-600 mt-1 mb-3">{saveError}</p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setReassigning(null);
                  setTargetAgentId("");
                  setSaveError(null);
                }}
                className="flex-1 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReassign}
                disabled={!targetAgentId || saving}
                className="flex-1 py-2 text-sm bg-[#0052CC] hover:bg-[#0747A6] text-white rounded-md font-medium disabled:opacity-50 transition-colors"
              >
                {saving ? "Reassigning…" : "Reassign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Agent detail panel ───────────────────────────────────────────────────────

function AgentDetailPanel({
  agent,
  allAgents,
  routingPaused,
  onToggleRouting,
  onReassign,
  onEscalate,
  onOpen,
}: {
  agent: Agent;
  allAgents: Agent[];
  routingPaused: boolean;
  onToggleRouting: () => void;
  onReassign: (issue: AgentIssue) => void;
  onEscalate: (issue: AgentIssue) => void;
  onOpen: (issue: AgentIssue) => void;
}) {
  const badge = STATUS_BADGE[agent.status];
  const actionSuggestion = suggestedLeadAction(agent);
  const isHealthy = agent.status === "available" && agent.overdue === 0;

  // Risky tickets for reassignment recommendations
  const riskyIssues = agent.issues.filter(
    (i) => i.isOverdue || i.isSlaRisk || i.priority === "CRITICAL"
  );

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-[#0747A6] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
          {initials(agent.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {agent.name}
            </h2>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.cls}`}
            >
              {badge.label}
            </span>
            <span className="text-xs text-slate-400">{agent.email}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {agent.assigned}/{agent.capacityMax} capacity ·{" "}
            {agent.overdue > 0 ? (
              <span className="text-red-600 font-medium">
                {agent.overdue} overdue
              </span>
            ) : (
              "0 overdue"
            )}
            {agent.critical > 0 && (
              <>
                {" "}
                ·{" "}
                <span className="text-red-500 font-medium">
                  {agent.critical} critical
                </span>
              </>
            )}
          </p>
        </div>
        {/* Routing control */}
        <button
          onClick={onToggleRouting}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors ${
            routingPaused
              ? "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:border-emerald-400 hover:text-emerald-700"
              : "border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:border-red-300 hover:text-red-600"
          }`}
        >
          {routingPaused ? (
            <>
              <Play className="w-3.5 h-3.5" /> Resume Routing
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5" /> Pause Routing
            </>
          )}
        </button>
      </div>

      {/* Suggested action banner */}
      <div
        className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${
          isHealthy
            ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900"
            : agent.status === "overloaded"
            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
            : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
        }`}
      >
        {isHealthy ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle
            className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
              agent.status === "overloaded"
                ? "text-red-500"
                : "text-amber-500"
            }`}
          />
        )}
        <div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Suggested action
          </p>
          <p
            className={`text-xs mt-0.5 ${
              isHealthy
                ? "text-emerald-700 dark:text-emerald-300"
                : agent.status === "overloaded"
                ? "text-red-700 dark:text-red-300"
                : "text-amber-700 dark:text-amber-300"
            }`}
          >
            {actionSuggestion}
          </p>
        </div>
      </div>

      {/* Ticket queue */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Ticket Queue ({agent.issues.length})
        </p>

        {agent.issues.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-10 text-center">
            <CheckCircle2 className="w-7 h-7 mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-400">No active tickets</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_90px_100px_72px] gap-3 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              {["Ticket", "Priority", "State", ""].map((h) => (
                <p key={h} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{h}</p>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {agent.issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`grid grid-cols-[1fr_90px_100px_72px] gap-3 px-4 py-3 items-center hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    issue.isOverdue ? "bg-red-50/30 dark:bg-red-950/10"
                    : issue.isSlaRisk ? "bg-amber-50/30 dark:bg-amber-950/10"
                    : ""
                  }`}
                >
                  {/* Ticket: key + title + customer */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[issue.priority] ?? "bg-slate-400"}`} />
                      <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">{issue.ticketKey ?? "—"}</span>
                      <span className="text-[10px] text-slate-400 truncate">· {issue.client.name}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{issue.title}</p>
                  </div>

                  {/* Priority */}
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${PRIORITY_LABEL[issue.priority] ?? ""} w-fit`}>
                    {issue.priority}
                  </span>

                  {/* Status + SLA combined */}
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_LABEL[issue.status] ?? "bg-slate-100 text-slate-600"} w-fit`}>
                      {issue.status.replace(/_/g, " ")}
                    </span>
                    <SlaStateChip issue={issue} />
                  </div>

                  {/* Actions — icon buttons only */}
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => onOpen(issue)} title="Open ticket"
                      className="p-1.5 rounded text-slate-400 hover:text-[#0052CC] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onReassign(issue)} title="Reassign"
                      className="p-1.5 rounded text-slate-400 hover:text-[#0052CC] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onEscalate(issue)} title="Escalate"
                      className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors">
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recommended reassignments */}
      {riskyIssues.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Recommended Reassignments
          </p>
          <div className="space-y-2">
            {riskyIssues.map((issue) => {
              const suggestion = suggestTarget(allAgents, agent.id, issue);
              return (
                <div
                  key={issue.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[issue.priority] ?? "bg-slate-400"}`}
                      />
                      <span className="text-[11px] font-mono text-slate-400">
                        {issue.ticketKey ?? "—"}
                      </span>
                      <SlaStateChip issue={issue} />
                    </div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                      {issue.title}
                    </p>
                  </div>
                  {suggestion ? (
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {suggestion.agent.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {suggestion.reason}
                        </p>
                      </div>
                      <button
                        onClick={() => onReassign(issue)}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-[#0052CC] hover:bg-[#0747A6] text-white rounded-md transition-colors whitespace-nowrap"
                      >
                        Reassign <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic flex-shrink-0">
                      No safe reassignment target
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
