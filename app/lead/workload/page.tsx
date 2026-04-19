"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Users, ShieldAlert, RefreshCw, ChevronDown } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";

interface AgentIssue {
  id: string; ticketKey: string | null; title: string;
  priority: string; status: string; slaDueAt: string | null;
  client: { name: string };
}
interface Agent {
  id: string; name: string; email: string; assigned: number; overdue: number;
  issues: AgentIssue[];
}

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500", HIGH: "bg-amber-500", MEDIUM: "bg-blue-400", LOW: "bg-slate-400",
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: "text-red-600 bg-red-50 dark:bg-red-950/30",
  ACKNOWLEDGED: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  IN_PROGRESS: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
};

export default function WorkloadPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState<{ issueId: string; fromAgent: string } | null>(null);
  const [targetAgent, setTargetAgent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lead/agents");
      if (res.ok) setAgents((await res.json()).agents ?? []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleReassign = async () => {
    if (!reassigning || !targetAgent) return;
    setSaving(true);
    try {
      await fetch(`/api/dashboard/tickets/${reassigning.issueId}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: targetAgent }),
      });
      setReassigning(null);
      setTargetAgent("");
      load();
    } catch {} finally { setSaving(false); }
  };

  const now = new Date();

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => router.push("/dashboard")} className="text-[#0052CC] dark:text-blue-400 hover:underline font-medium">Lead</button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Agent Workload</span>
            </div>
          }
          right={
            <button onClick={load} className="p-1.5 rounded-md text-slate-500 hover:text-[#0052CC] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse" />)}
            </div>
          ) : agents.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-500">No agents found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {agents.map((agent) => {
                const isExpanded = expanded === agent.id;
                return (
                  <div key={agent.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {/* Agent header card */}
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0747A6] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {agent.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{agent.name}</p>
                        <p className="text-xs text-slate-400 truncate">{agent.email}</p>
                      </div>
                      <div className="flex items-center gap-3 text-center">
                        <div>
                          <p className="text-lg font-black text-slate-800 dark:text-slate-200">{agent.assigned}</p>
                          <p className="text-[10px] text-slate-400">Assigned</p>
                        </div>
                        <div>
                          <p className={`text-lg font-black ${agent.overdue > 0 ? "text-red-600" : "text-slate-300"}`}>{agent.overdue}</p>
                          <p className="text-[10px] text-slate-400">Overdue</p>
                        </div>
                      </div>
                      <button onClick={() => setExpanded(isExpanded ? null : agent.id)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                    </div>

                    {/* Capacity bar */}
                    <div className="px-4 pb-3">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Capacity</span>
                        <span>{agent.assigned}/10</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${agent.assigned >= 8 ? "bg-red-500" : agent.assigned >= 5 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(100, (agent.assigned / 10) * 100)}%` }} />
                      </div>
                    </div>

                    {/* Expanded issue list */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-800">
                        {agent.issues.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-4">No active issues</p>
                        ) : (
                          <div className="divide-y divide-slate-50 dark:divide-slate-800">
                            {agent.issues.map((issue) => {
                              const overdue = issue.slaDueAt && new Date(issue.slaDueAt) < now;
                              return (
                                <div key={issue.id} className="px-4 py-2.5 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[issue.priority]}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{issue.title}</p>
                                    <p className="text-[10px] text-slate-400">{issue.client.name}</p>
                                  </div>
                                  {overdue && <ShieldAlert className="w-3 h-3 text-red-500 flex-shrink-0" />}
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${STATUS_COLOR[issue.status] ?? "bg-slate-100 text-slate-600"}`}>
                                    {issue.status.replace("_", " ")}
                                  </span>
                                  <button
                                    onClick={() => { setReassigning({ issueId: issue.id, fromAgent: agent.id }); setTargetAgent(""); }}
                                    className="text-[10px] px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 rounded text-slate-500 hover:text-[#0052CC] hover:border-[#0052CC] transition-colors flex-shrink-0">
                                    Reassign
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Reassign modal */}
      {reassigning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-5 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">Reassign Issue</h3>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Assign to agent</label>
            <select value={targetAgent} onChange={(e) => setTargetAgent(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0052CC] mb-4 text-slate-800 dark:text-slate-200">
              <option value="">Select agent...</option>
              {agents.filter((a) => a.id !== reassigning.fromAgent).map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.assigned} assigned)</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setReassigning(null)} className="flex-1 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleReassign} disabled={!targetAgent || saving}
                className="flex-1 py-2 text-sm bg-[#0052CC] hover:bg-[#0747A6] text-white rounded-md font-medium disabled:opacity-50">
                {saving ? "Reassigning..." : "Reassign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
