"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Layers, AlertCircle, CheckCircle, Clock, RefreshCw, ChevronDown } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";

interface Milestone {
  id: string; title: string; status: string; dueDate: string | null;
}
interface Project {
  id: string; name: string; status: string; startDate: string | null; endDate: string | null;
  client: { id: string; name: string };
  lead: { id: string; name: string } | null;
  milestones: Milestone[];
  _count: { issues: number };
  issues: { id: string; priority: string; status: string }[];
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  ON_HOLD: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  COMPLETED: "bg-slate-100 text-slate-600 dark:bg-slate-800",
};
const MILESTONE_STYLE: Record<string, { bar: string; label: string }> = {
  COMPLETED: { bar: "bg-emerald-500", label: "text-emerald-600" },
  IN_PROGRESS: { bar: "bg-blue-500", label: "text-blue-600" },
  DELAYED: { bar: "bg-red-500", label: "text-red-600" },
  PENDING: { bar: "bg-slate-300 dark:bg-slate-600", label: "text-slate-400" },
};

function progressForMilestones(milestones: Milestone[]) {
  if (!milestones.length) return 0;
  const done = milestones.filter((m) => m.status === "COMPLETED").length;
  return Math.round((done / milestones.length) * 100);
}

function projectRisk(p: Project) {
  const now = new Date();
  const overdue = p.issues.filter((i) => ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"].includes(i.status) && i.priority === "CRITICAL").length;
  const delayed = p.milestones.filter((m) => m.status === "DELAYED").length;
  if (delayed > 0 || overdue > 0) return "At Risk";
  if (p.status === "COMPLETED") return "Complete";
  return "On Track";
}

const RISK_STYLE: Record<string, string> = {
  "On Track": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "At Risk": "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Complete: "bg-slate-100 text-slate-500 dark:bg-slate-800",
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lead/projects");
      if (res.ok) setProjects((await res.json()).projects ?? []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => router.push("/dashboard")} className="text-[#0052CC] dark:text-blue-400 hover:underline font-medium">Lead</button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Project Overview</span>
            </div>
          }
          right={
            <button onClick={load} className="p-1.5 rounded-md text-slate-400 hover:text-[#0052CC] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse" />)}</div>
          ) : projects.length === 0 ? (
            <div className="py-16 text-center">
              <Layers className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-500">No projects found</p>
            </div>
          ) : (
            projects.map((project) => {
              const progress = progressForMilestones(project.milestones);
              const risk = projectRisk(project);
              const isExpanded = expanded === project.id;
              const openIssues = project.issues.filter((i) => !["RESOLVED", "CLOSED"].includes(i.status)).length;

              return (
                <div key={project.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {/* Project header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{project.name}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${STATUS_STYLE[project.status]}`}>{project.status.replace("_", " ")}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${RISK_STYLE[risk]}`}>{risk}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{project.client.name} · Lead: {project.lead?.name ?? "Unassigned"}</p>
                      </div>
                      <div className="flex items-center gap-3 text-center">
                        <div>
                          <p className="text-lg font-black text-[#0052CC]">{progress}%</p>
                          <p className="text-[10px] text-slate-400">Progress</p>
                        </div>
                        <div>
                          <p className={`text-lg font-black ${openIssues > 0 ? "text-amber-600" : "text-slate-300"}`}>{openIssues}</p>
                          <p className="text-[10px] text-slate-400">Open Issues</p>
                        </div>
                        <button onClick={() => setExpanded(isExpanded ? null : project.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0052CC] rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    {/* Milestone timeline */}
                    {project.milestones.length > 0 ? (
                      <div className="flex items-center gap-0 overflow-x-auto">
                        {project.milestones.map((ms, idx) => {
                          const s = MILESTONE_STYLE[ms.status] ?? MILESTONE_STYLE.PENDING;
                          return (
                            <div key={ms.id} className="flex items-center flex-1 min-w-0">
                              <div className="flex flex-col items-center min-w-0 flex-1">
                                <div className={`w-full h-1.5 ${idx === 0 ? "rounded-l-full" : ""} ${idx === project.milestones.length - 1 ? "rounded-r-full" : ""} ${s.bar}`} />
                                <div className="mt-1.5 px-1 text-center">
                                  <p className={`text-[10px] font-medium truncate max-w-20 ${s.label}`}>{ms.title}</p>
                                  {ms.dueDate && <p className="text-[9px] text-slate-400">{new Date(ms.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>}
                                </div>
                              </div>
                              {idx < project.milestones.length - 1 && <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 flex-shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No milestones defined</p>
                    )}
                  </div>

                  {/* Expanded: AI weekly summary + issues */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-800 p-5 space-y-4">
                      {/* Auto-generated weekly summary */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500 mb-1">AI Weekly Summary</p>
                        <p className="text-xs text-blue-900 dark:text-blue-200">
                          {project.name} is {risk === "On Track" ? "progressing well" : "experiencing delays"}. 
                          {project.milestones.filter((m) => m.status === "COMPLETED").length}/{project.milestones.length} milestones completed. 
                          {openIssues > 0 ? ` ${openIssues} open issues require attention.` : " All issues resolved."} 
                          {risk === "At Risk" ? " Recommend reviewing blocked milestones with the customer." : " On track for delivery."}
                        </p>
                      </div>

                      {/* Linked issues */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Linked Issues ({project._count.issues})</p>
                        {project.issues.length === 0 ? (
                          <p className="text-xs text-slate-400">No open issues</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {project.issues.slice(0, 8).map((issue) => (
                              <button key={issue.id} onClick={() => router.push(`/tickets/${issue.id}`)}
                                className={`text-xs px-2 py-1 rounded font-medium border transition-colors ${
                                  issue.priority === "CRITICAL" ? "border-red-300 text-red-600 bg-red-50 dark:bg-red-950/30 hover:bg-red-100" :
                                  issue.priority === "HIGH" ? "border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100" :
                                  "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100"
                                }`}>
                                {issue.priority} · {issue.status.replace("_", " ")}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </main>
      </div>
    </div>
  );
}
