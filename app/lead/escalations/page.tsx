"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, AlertTriangle, ShieldAlert, RefreshCw, Plus,
  X, CheckCircle, Bot, User, Clock, ArrowUpRight, ShieldOff,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";

interface EscalatedIssue {
  id: string;
  ticketKey: string | null;
  title: string;
  priority: string;
  status: string;
  escalatedAt: string | null;
  slaDueAt: string | null;
  slaBreached: boolean;
  escalationReason: string | null;
  escalatedByName: string | null;
  isAutoEscalated: boolean;
  assignedTo: { id: string; name: string } | null;
  escalatedTo: { id: string; name: string } | null;
  client: { id: string; name: string };
  raisedBy: { name: string };
}

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900",
  HIGH: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900",
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
};

const RULE_LABELS: Record<string, string> = {
  "CRITICAL ticket unassigned for more than 30 minutes": "Unassigned >30m",
  "HIGH priority ticket unassigned for more than 2 hours": "Unassigned >2h",
  "SLA deadline breached — immediate attention required": "SLA Breached",
  "Ticket stuck in IN_PROGRESS for more than 48 hours": "Stuck 48h",
};

function getRuleShortLabel(reason: string | null): string {
  if (!reason) return "Manual";
  for (const [key, label] of Object.entries(RULE_LABELS)) {
    if (reason.startsWith(key.split(" ")[0]) || reason.includes(key.split(" — ")[0])) {
      return label;
    }
  }
  if (reason.startsWith("Systemic")) return "Systemic";
  if (reason.startsWith("Manual") || reason.startsWith("De-")) return "Manual";
  return "Auto";
}

function relativeTime(d: string | null) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function timeLeft(d: string | null) {
  if (!d) return null;
  const diff = new Date(d).getTime() - Date.now();
  if (diff < 0) return null;
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m left`;
  return `${h}h left`;
}

const ESCALATION_RULES = [
  { id: 1, label: "CRITICAL unassigned", detail: "No agent assigned within 30 minutes", action: "Auto-assign to Lead + notify", active: true },
  { id: 2, label: "HIGH unassigned", detail: "No agent assigned within 2 hours", action: "Notify Lead", active: true },
  { id: 3, label: "SLA breached", detail: "Ticket deadline passed and still open", action: "Escalate + notify Lead & Admin", active: true },
  { id: 4, label: "Stuck in progress", detail: "No update for more than 48 hours", action: "Flag for Lead review", active: true },
  { id: 5, label: "Systemic pattern", detail: "Same customer, same category, 3+ tickets in 7 days", action: "Flag as systemic + notify Lead", active: true },
];

export default function EscalationsPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<EscalatedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualIssueId, setManualIssueId] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [deescalating, setDeescalating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lead/escalations");
      if (res.ok) setIssues((await res.json()).issues ?? []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const triggerEscalation = async () => {
    if (!manualIssueId.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/lead/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId: manualIssueId.trim(), note: manualNote }),
      });
      if (res.ok) {
        showToast("Ticket escalated successfully");
        setShowManualModal(false);
        setManualIssueId("");
        setManualNote("");
        load();
      } else {
        showToast("Could not find that ticket", "error");
      }
    } catch { showToast("Something went wrong", "error"); }
    finally { setSubmitting(false); }
  };

  const deescalate = async (issue: EscalatedIssue) => {
    setDeescalating(issue.id);
    try {
      const res = await fetch("/api/lead/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deescalate", issueId: issue.id }),
      });
      if (res.ok) { showToast("Escalation resolved"); load(); }
    } catch { showToast("Failed to de-escalate", "error"); }
    finally { setDeescalating(null); }
  };

  const critical = issues.filter((i) => i.priority === "CRITICAL");
  const other = issues.filter((i) => i.priority !== "CRITICAL");

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F8F9FB] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => router.push("/dashboard")} className="text-[#0052CC] dark:text-blue-400 hover:underline font-medium">Lead</button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Escalation Management</span>
            </div>
          }
          right={undefined}
        />

        <main className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Summary KPIs */}
          {!loading && (
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Total Active", value: issues.length, color: "border-l-red-500", iconCls: "bg-red-50 text-red-500" },
                { label: "Critical", value: critical.length, color: "border-l-red-600", iconCls: "bg-red-100 text-red-600" },
                { label: "SLA Breached", value: issues.filter(i => i.slaBreached).length, color: "border-l-amber-500", iconCls: "bg-amber-50 text-amber-500" },
                { label: "Auto-Escalated", value: issues.filter(i => i.isAutoEscalated).length, color: "border-l-blue-400", iconCls: "bg-blue-50 text-blue-500" },
              ].map(({ label, value, color, iconCls }) => (
                <div key={label} className={`bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border-l-[3px] ${color} border border-slate-200 dark:border-slate-800 shadow-sm`}>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
                  <p className="text-[22px] font-bold tabular-nums text-slate-900 dark:text-slate-50 leading-none">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Active escalations */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Active Escalations</h3>
                {!loading && issues.length > 0 && (
                  <span className="text-[11px] px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-full font-semibold">{issues.length}</span>
                )}
              </div>
              <button onClick={() => setShowManualModal(true)} className="flex items-center gap-1 px-3 py-1.5 bg-[#0052CC] text-white text-xs font-medium rounded hover:bg-[#003fa0] transition">
                <Plus className="w-3.5 h-3.5" /> Manual Escalation
              </button>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">{[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
              ))}</div>
            ) : issues.length === 0 ? (
              <div className="py-14 text-center">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No active escalations</p>
                <p className="text-xs text-slate-400 mt-1">All tickets are within normal thresholds</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...critical, ...other].map((issue) => {
                  const slaLeft = timeLeft(issue.slaDueAt);
                  const ruleLabel = getRuleShortLabel(issue.escalationReason);
                  return (
                    <div key={issue.id} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-start gap-4">

                        {/* Left: ticket info */}
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/tickets/${issue.ticketKey ?? issue.id}`)}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                              {issue.ticketKey ?? issue.id.slice(0, 8)}
                            </span>
                            <span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${PRIORITY_COLOR[issue.priority]}`}>
                              {issue.priority}
                            </span>
                            {/* Auto vs Manual badge */}
                            {issue.isAutoEscalated ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900 font-medium">
                                <Bot className="w-2.5 h-2.5" /> Auto · {ruleLabel}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 font-medium">
                                <User className="w-2.5 h-2.5" /> Manual
                              </span>
                            )}
                            {issue.slaBreached && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 font-medium">
                                <ShieldAlert className="w-2.5 h-2.5" /> SLA Breached
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{issue.title}</p>
                          {issue.escalationReason && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                              {issue.escalationReason}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                            <span>{issue.client.name}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> {relativeTime(issue.escalatedAt)}
                            </span>
                            {issue.assignedTo && (
                              <>
                                <span>·</span>
                                <span>Assigned: {issue.assignedTo.name}</span>
                              </>
                            )}
                            {slaLeft && (
                              <>
                                <span>·</span>
                                <span className="text-amber-500 font-medium">{slaLeft}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right: actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => router.push(`/tickets/${issue.ticketKey ?? issue.id}`)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-[#0052CC] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Open ticket"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deescalate(issue)}
                            disabled={deescalating === issue.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-colors disabled:opacity-50"
                            title="Mark as resolved / de-escalate"
                          >
                            <ShieldOff className="w-3 h-3" />
                            {deescalating === issue.id ? "..." : "Resolve"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Escalation rules */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Auto-Escalation Rules</h3>
              <span className="text-[11px] px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900 font-medium flex items-center gap-1">
                <Bot className="w-2.5 h-2.5" /> Runs every 15 min
              </span>
            </div>
            <div className="space-y-2">
              {ESCALATION_RULES.map((rule) => (
                <div key={rule.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{rule.label}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{rule.detail}</p>
                    <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-0.5">→ {rule.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>

      {/* Manual escalation modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Manual Escalation</h3>
                <p className="text-xs text-slate-400 mt-0.5">Escalate any ticket to your attention immediately</p>
              </div>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">
                  Ticket Key or ID <span className="text-red-500">*</span>
                </label>
                <input
                  value={manualIssueId}
                  onChange={(e) => setManualIssueId(e.target.value)}
                  placeholder="e.g. CRMA-1020"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0052CC] placeholder:text-slate-300"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Reason (internal note)</label>
                <textarea
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  rows={3}
                  placeholder="Why is this being escalated?"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0052CC] resize-none placeholder:text-slate-300"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowManualModal(false)} className="flex-1 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={triggerEscalation}
                disabled={!manualIssueId.trim() || submitting}
                className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {submitting ? "Escalating..." : "Escalate Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 z-50 transition-all ${
          toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
        }`}>
          {toast.type === "error" ? <X className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
