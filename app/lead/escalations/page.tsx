"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, AlertTriangle, ShieldAlert, RefreshCw, Plus, X, CheckCircle } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";

interface EscalatedIssue {
  id: string; ticketKey: string | null; title: string; priority: string; status: string;
  escalatedAt: string | null; slaDueAt: string | null; slaBreached: boolean;
  assignedTo: { id: string; name: string } | null;
  escalatedTo: { id: string; name: string } | null;
  client: { id: string; name: string };
  raisedBy: { name: string };
}

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  HIGH: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-800",
};

// Static escalation rules (no DB schema for rules yet)
const ESCALATION_RULES = [
  { id: 1, condition: "No response within 2h for CRITICAL", action: "Notify Lead + reassign", active: true },
  { id: 2, condition: "No response within 4h for HIGH", action: "Notify Lead", active: true },
  { id: 3, condition: "SLA breach detected", action: "Escalate + notify admin", active: true },
  { id: 4, condition: "Issue re-opened 3+ times", action: "Flag for Lead review", active: false },
];

export default function EscalationsPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<EscalatedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState(ESCALATION_RULES);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualIssueId, setManualIssueId] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lead/escalations");
      if (res.ok) setIssues((await res.json()).issues ?? []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const triggerEscalation = async () => {
    if (!manualIssueId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/lead/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId: manualIssueId, note: manualNote }),
      });
      if (res.ok) { setToast("Escalation triggered"); load(); setShowManualModal(false); setManualIssueId(""); setManualNote(""); }
    } catch {} finally { setSubmitting(false); setTimeout(() => setToast(""), 3000); }
  };

  const relativeTime = (d: string | null) => {
    if (!d) return "—";
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
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
              <span className="text-slate-700 dark:text-slate-300 font-medium">Escalation Management</span>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              <button onClick={load} className="p-1.5 rounded-md text-slate-400 hover:text-[#0052CC] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button onClick={() => setShowManualModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0052CC] hover:bg-[#0747A6] text-white text-xs rounded-md font-medium transition-colors">
                <Plus className="w-3.5 h-3.5" />Manual Escalation
              </button>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active escalations */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Active Escalations</h3>
                {!loading && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">{issues.length}</span>}
              </div>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}</div>
            ) : issues.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
                <p className="text-sm text-slate-500">No active escalations</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {["Ticket", "Customer", "Priority", "Status", "Assigned To", "Escalated", "SLA"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {issues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                      onClick={() => router.push(`/tickets/${issue.ticketKey ?? issue.id}`)}>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-slate-500 mb-0.5">{issue.ticketKey ?? issue.id.slice(0, 8)}</p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{issue.title}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{issue.client.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${PRIORITY_COLOR[issue.priority]}`}>{issue.priority}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{issue.status.replace("_", " ")}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{issue.assignedTo?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{relativeTime(issue.escalatedAt)}</td>
                      <td className="px-4 py-3">
                        {issue.slaBreached ? (
                          <span className="text-xs text-red-600 font-semibold flex items-center gap-1"><ShieldAlert className="w-3 h-3" />Breached</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Escalation rules */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Escalation Rules</h3>
            </div>
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <button onClick={() => setRules((p) => p.map((r) => r.id === rule.id ? { ...r, active: !r.active } : r))}
                    className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${rule.active ? "bg-[#0052CC]" : "bg-slate-300 dark:bg-slate-600"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${rule.active ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{rule.condition}</p>
                    <p className="text-xs text-slate-400">Action: {rule.action}</p>
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
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Trigger Manual Escalation</h3>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Issue ID or Ticket Key *</label>
                <input value={manualIssueId} onChange={(e) => setManualIssueId(e.target.value)}
                  placeholder="e.g. clxxxxxxxx or TKT-1042"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0052CC]" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Escalation Note (internal)</label>
                <textarea value={manualNote} onChange={(e) => setManualNote(e.target.value)}
                  rows={3} placeholder="Reason for escalation..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0052CC] resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowManualModal(false)} className="flex-1 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={triggerEscalation} disabled={!manualIssueId || submitting}
                className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md font-medium disabled:opacity-50">
                {submitting ? "Escalating..." : "Escalate Issue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <CheckCircle className="w-4 h-4" />{toast}
        </div>
      )}
    </div>
  );
}
