"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  Building2, Plus, Users, AlertCircle, ToggleLeft, ToggleRight,
  X, ChevronRight, Search, ExternalLink, Layers, Shield,
  CheckCircle2, Globe, ArrowRight, RefreshCw, Ticket,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClientOrg {
  id: string;
  name: string;
  industry: string | null;
  isActive: boolean;
  updatedAt: string;
  members: { user: { id: string; name: string; email: string; role: string; isActive: boolean } }[];
  issues: { status: string; slaBreached: boolean }[];
  projects: { id: string; name: string; status: string }[];
}

const AVATAR_STYLES = [
  { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300", ring: "ring-blue-100 dark:ring-blue-900/50", accent: "bg-blue-500" },
  { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300", ring: "ring-violet-100 dark:ring-violet-900/50", accent: "bg-violet-500" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-100 dark:ring-emerald-900/50", accent: "bg-emerald-500" },
  { bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300", ring: "ring-rose-100 dark:ring-rose-900/50", accent: "bg-rose-500" },
  { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", ring: "ring-amber-100 dark:ring-amber-900/50", accent: "bg-amber-500" },
  { bg: "bg-cyan-50 dark:bg-cyan-950/30", text: "text-cyan-700 dark:text-cyan-300", ring: "ring-cyan-100 dark:ring-cyan-900/50", accent: "bg-cyan-500" },
  { bg: "bg-indigo-50 dark:bg-indigo-950/30", text: "text-indigo-700 dark:text-indigo-300", ring: "ring-indigo-100 dark:ring-indigo-900/50", accent: "bg-indigo-500" },
  { bg: "bg-teal-50 dark:bg-teal-950/30", text: "text-teal-700 dark:text-teal-300", ring: "ring-teal-100 dark:ring-teal-900/50", accent: "bg-teal-500" },
];

function avatarStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_STYLES[Math.abs(hash) % AVATAR_STYLES.length];
}

function planLabel(c: ClientOrg) {
  const total = c.issues.length;
  if (total > 100) return { label: "Enterprise", color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" };
  if (total > 20) return { label: "Growth", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" };
  return { label: "Starter", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" };
}

function healthScore(c: ClientOrg) {
  if (c.issues.length === 0) return 100;
  const resolved = c.issues.filter((i) => ["RESOLVED", "CLOSED"].includes(i.status)).length;
  const breaches = c.issues.filter((i) => i.slaBreached).length;
  return Math.min(100, Math.max(0, Math.round((resolved / c.issues.length) * 100 - (breaches / c.issues.length) * 20)));
}

function scoreStyle(score: number) {
  if (score >= 70) return { text: "text-emerald-600", bar: "#10b981" };
  if (score >= 40) return { text: "text-amber-600", bar: "#f59e0b" };
  return { text: "text-red-600", bar: "#ef4444" };
}

function WorkspaceCard({ c, isSelected, onClick }: { c: ClientOrg; isSelected: boolean; onClick: () => void }) {
  const plan = planLabel(c);
  const openIssues = c.issues.filter((i) => ["OPEN", "IN_PROGRESS", "ACKNOWLEDGED"].includes(i.status)).length;
  const resolved = c.issues.filter((i) => ["RESOLVED", "CLOSED"].includes(i.status)).length;
  const breaches = c.issues.filter((i) => i.slaBreached).length;
  const score = healthScore(c);
  const ss = scoreStyle(score);
  const avatar = avatarStyle(c.name);

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white dark:bg-slate-900 rounded-lg border transition-all duration-200 cursor-pointer overflow-hidden
        ${isSelected
          ? "border-[#0052CC] shadow-sm ring-2 ring-blue-100 dark:ring-blue-950/50"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm"
        }`}
    >
      <div className={`h-0.5 w-full ${avatar.accent} opacity-70`} />
      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg ${avatar.bg} ${avatar.text} ring-1 ${avatar.ring} flex items-center justify-center font-semibold text-sm flex-shrink-0`}>
            {c.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{c.name}</h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${plan.color}`}>{plan.label}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 truncate">
              <Globe className="w-3 h-3 flex-shrink-0" />{c.industry || "No industry"}
            </p>
          </div>
          <span className={`mt-1 flex items-center gap-1 text-[10px] font-medium ${c.isActive ? "text-emerald-600" : "text-slate-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
            {c.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-md p-2.5 text-center">
            <p className="text-base font-semibold tabular-nums text-slate-800 dark:text-slate-200">{c.members.length}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Users</p>
          </div>
          <div className={`rounded-md p-2.5 text-center ${openIssues > 0 ? "bg-red-50/80 dark:bg-red-950/20" : "bg-slate-50 dark:bg-slate-800/50"}`}>
            <p className={`text-base font-semibold tabular-nums ${openIssues > 0 ? "text-red-600" : "text-slate-800 dark:text-slate-200"}`}>{openIssues}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Open</p>
          </div>
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 rounded-md p-2.5 text-center">
            <p className="text-base font-semibold tabular-nums text-emerald-600">{resolved}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Resolved</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Health</span>
            <span className={`text-xs font-semibold tabular-nums ${ss.text}`}>{score}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: ss.bar }} />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            {breaches > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-900/30">
                <Shield className="w-2.5 h-2.5" />{breaches} breach{breaches > 1 ? "es" : ""}
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Layers className="w-2.5 h-2.5" />{c.projects.length} project{c.projects.length !== 1 ? "s" : ""}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 transition-colors group-hover:text-[#0052CC]" />
        </div>
      </div>
    </div>
  );
}

function CustomerWorkspacesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<ClientOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("id"));
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", industry: "", logoUrl: "" });
  const [createError, setCreateError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "users" | "projects">("overview");

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customers");
      if (res.ok) setClients((await res.json()).clients ?? []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(); }, []);

  const filtered = clients.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.industry ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || (filterStatus === "active" ? c.isActive : !c.isActive);
    return matchSearch && matchStatus;
  });

  const selected = selectedId ? clients.find((c) => c.id === selectedId) : null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!createForm.name.trim()) { setCreateError("Company name is required"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        setShowCreate(false);
        setCreateForm({ name: "", industry: "", logoUrl: "" });
        fetchClients();
      } else {
        setCreateError("Failed to create workspace");
      }
    } catch { setCreateError("An error occurred"); }
    finally { setCreating(false); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    setToggling(id);
    try {
      await fetch(`/api/admin/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      setClients((prev) => prev.map((c) => c.id === id ? { ...c, isActive: !current } : c));
    } catch {} finally { setToggling(null); }
  };

  const totalActive = clients.filter((c) => c.isActive).length;
  const totalOpenIssues = clients.reduce((s, c) => s + c.issues.filter((i) => ["OPEN", "IN_PROGRESS", "ACKNOWLEDGED"].includes(i.status)).length, 0);
  const totalBreaches = clients.reduce((s, c) => s + c.issues.filter((i) => i.slaBreached).length, 0);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => router.push("/admin")} className="text-[#0052CC] dark:text-blue-400 hover:underline font-medium">Admin</button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Customer Workspaces</span>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              <button onClick={fetchClients} className="p-1.5 rounded-md text-slate-500 hover:text-[#0052CC] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <Button onClick={() => setShowCreate(true)} className="h-8 text-xs bg-[#0052CC] hover:bg-[#0747A6] text-white px-3">
                <Plus className="w-3.5 h-3.5 mr-1.5" />New Workspace
              </Button>
            </div>
          }
        />

        <div className="flex-1 flex overflow-hidden">
          <div className={`${selected ? "w-[58%] flex-shrink-0" : "flex-1"} flex flex-col overflow-hidden`}>
            <div className="px-6 pt-5">
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: "Workspaces", value: clients.length, icon: Building2, colorText: "text-[#0052CC]", colorBg: "bg-blue-50 dark:bg-blue-950/20" },
                  { label: "Active", value: totalActive, icon: CheckCircle2, colorText: "text-emerald-600", colorBg: "bg-emerald-50 dark:bg-emerald-950/20" },
                  { label: "Open Issues", value: totalOpenIssues, icon: AlertCircle, colorText: "text-red-600", colorBg: "bg-red-50 dark:bg-red-950/20" },
                  { label: "SLA Breaches", value: totalBreaches, icon: Shield, colorText: "text-amber-600", colorBg: "bg-amber-50 dark:bg-amber-950/20" },
                ].map(({ label, value, icon: Icon, colorText, colorBg }) => (
                  <div key={label} className={`${colorBg} rounded-xl p-3.5 flex items-center gap-3`}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/60 dark:bg-white/5">
                      <Icon className={`w-4 h-4 ${colorText}`} />
                    </div>
                    <div>
                      <p className={`text-xl font-semibold tabular-nums ${colorText}`}>{loading ? "—" : value}</p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search workspaces..."
                    className="w-56 pl-8 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 focus:border-[#0052CC]"
                  />
                </div>
                <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1 gap-0.5">
                  {(["all", "active", "inactive"] as const).map((f) => (
                    <button key={f} onClick={() => setFilterStatus(f)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${filterStatus === f ? "bg-[#0052CC] text-white shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>
                      {f}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-400 ml-auto">{filtered.length} workspace{filtered.length !== 1 ? "s" : ""}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {loading ? (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-56 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No workspaces found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter</p>
                  {!search && filterStatus === "all" && (
                    <button onClick={() => setShowCreate(true)} className="mt-4 flex items-center gap-1.5 text-xs text-[#0052CC] hover:underline font-medium">
                      <Plus className="w-3.5 h-3.5" />Create your first workspace
                    </button>
                  )}
                </div>
              ) : (
                <div className={`grid gap-4 ${selected ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-2 xl:grid-cols-3"}`}>
                  {filtered.map((c) => (
                    <WorkspaceCard key={c.id} c={c} isSelected={selectedId === c.id}
                      onClick={() => { setSelectedId(selectedId === c.id ? null : c.id); setDetailTab("overview"); }} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {selected && (() => {
            const avatar = avatarStyle(selected.name);
            const score = healthScore(selected);
            const ss = scoreStyle(score);
            const openIssues = selected.issues.filter((i) => ["OPEN", "IN_PROGRESS", "ACKNOWLEDGED"].includes(i.status)).length;
            const resolved = selected.issues.filter((i) => ["RESOLVED", "CLOSED"].includes(i.status)).length;
            const breaches = selected.issues.filter((i) => i.slaBreached).length;
            const plan = planLabel(selected);
            return (
              <div className="flex-1 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40 flex-shrink-0">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-lg ${avatar.bg} ${avatar.text} ring-1 ${avatar.ring} flex items-center justify-center font-semibold text-base`}>
                        {selected.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleActive(selected.id, selected.isActive)} disabled={toggling === selected.id}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-semibold border transition-colors ${
                            selected.isActive
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-white text-slate-500"
                          }`}>
                          {selected.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                          {selected.isActive ? "Active" : "Inactive"}
                        </button>
                        <button onClick={() => setSelectedId(null)} className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-400 hover:text-slate-700 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-0.5">{selected.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />{selected.industry || "No industry set"}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${plan.color}`}>{plan.label}</span>
                      <span className="text-[10px] text-slate-400">Updated {new Date(selected.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                  {[
                    { label: "Users", value: selected.members.length, icon: Users, color: "text-[#0052CC]" },
                    { label: "Issues", value: selected.issues.length, icon: Ticket, color: "text-slate-700 dark:text-slate-300" },
                    { label: "Projects", value: selected.projects.length, icon: Layers, color: "text-violet-600" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="py-3 text-center">
                      <p className={`text-lg font-semibold tabular-nums ${color}`}>{value}</p>
                      <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5"><Icon className="w-3 h-3" />{label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 flex-shrink-0">
                  {(["overview", "users", "projects"] as const).map((t) => (
                    <button key={t} onClick={() => setDetailTab(t)}
                      className={`px-4 py-2.5 text-xs font-semibold capitalize transition-colors border-b-2 -mb-px
                        ${detailTab === t ? "border-[#0052CC] text-[#0052CC]" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                      {t}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  {detailTab === "overview" && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2.5">
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Health Score</p>
                          <span className={`text-sm font-semibold tabular-nums ${ss.text}`}>{score}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: ss.bar }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                          {score >= 70 ? "Great — most issues are resolved." : score >= 40 ? "Fair — some open issues need attention." : "Poor — many issues are overdue or breached."}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Issue Breakdown</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: "Open", value: openIssues, textColor: openIssues > 0 ? "text-red-600" : "text-slate-700 dark:text-slate-300", bg: openIssues > 0 ? "bg-red-50 dark:bg-red-950/20 hover:bg-red-100" : "bg-slate-50 dark:bg-slate-800/50", route: `/tickets?clientId=${selected.id}` },
                            { label: "Resolved", value: resolved, textColor: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20", route: null },
                            { label: "SLA Breaches", value: breaches, textColor: breaches > 0 ? "text-amber-600" : "text-slate-500", bg: breaches > 0 ? "bg-amber-50 dark:bg-amber-950/20" : "bg-slate-50 dark:bg-slate-800/50", route: null },
                            { label: "Total", value: selected.issues.length, textColor: "text-[#0052CC]", bg: "bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100", route: `/tickets?clientId=${selected.id}` },
                          ].map(({ label, value, textColor, bg, route }) => (
                            <button key={label} onClick={() => route && router.push(route)} disabled={!route}
                              className={`${bg} rounded-xl p-3 text-left transition-colors ${route ? "cursor-pointer" : "cursor-default"}`}>
                              <p className={`text-lg font-semibold tabular-nums ${textColor}`}>{value}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{label}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Quick Actions</p>
                        <div className="space-y-1.5">
                          {[
                            { label: "View All Issues", icon: AlertCircle, route: `/tickets?clientId=${selected.id}` },
                            { label: "Manage Users", icon: Users, route: `/admin/users?clientId=${selected.id}` },
                          ].map(({ label, icon: Icon, route }) => (
                            <button key={label} onClick={() => router.push(route)}
                              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-[#0052CC]/5 dark:hover:bg-blue-950/20 text-slate-600 dark:text-slate-400 hover:text-[#0052CC] transition-colors group">
                              <span className="flex items-center gap-2 text-xs font-semibold"><Icon className="w-3.5 h-3.5" />{label}</span>
                              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {detailTab === "users" && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{selected.members.length} member{selected.members.length !== 1 ? "s" : ""}</p>
                        <button onClick={() => router.push(`/admin/users?clientId=${selected.id}`)} className="flex items-center gap-1 text-xs text-[#0052CC] hover:underline font-medium">
                          Manage <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                      {selected.members.length === 0 ? (
                        <div className="py-10 text-center text-sm text-slate-400">No users yet</div>
                      ) : (
                        <div className="space-y-2">
                          {selected.members.map(({ user: u }) => (
                            <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                              <div className={`w-8 h-8 rounded-full ${avatarStyle(u.name).bg} ${avatarStyle(u.name).text} ring-1 ${avatarStyle(u.name).ring} flex items-center justify-center text-xs font-semibold flex-shrink-0`}>
                                {u.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{u.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{u.role.replace(/_/g, " ").toLowerCase()}</span>
                                <span className={`w-2 h-2 rounded-full ${u.isActive ? "bg-emerald-400" : "bg-slate-300 dark:bg-slate-600"}`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {detailTab === "projects" && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">{selected.projects.length} project{selected.projects.length !== 1 ? "s" : ""}</p>
                      {selected.projects.length === 0 ? (
                        <div className="py-10 text-center text-sm text-slate-400">No projects yet</div>
                      ) : (
                        <div className="space-y-2">
                          {selected.projects.map((p) => (
                            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center flex-shrink-0">
                                  <Layers className="w-4 h-4 text-violet-600" />
                                </div>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{p.name}</span>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ml-3 ${
                                p.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30" :
                                p.status === "ON_HOLD" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30" :
                                "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{p.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">New Customer Workspace</h2>
                  <p className="text-[11px] text-slate-400">Set up a new client organisation</p>
                </div>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-900/40">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{createError}
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Company Name <span className="text-red-500">*</span></Label>
                <Input value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. NovaTech Logistics" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Industry</Label>
                <Input value={createForm.industry} onChange={(e) => setCreateForm((p) => ({ ...p, industry: e.target.value }))} placeholder="e.g. Logistics, Retail, Finance" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Logo URL <span className="text-xs font-normal text-slate-400">(optional)</span></Label>
                <Input value={createForm.logoUrl} onChange={(e) => setCreateForm((p) => ({ ...p, logoUrl: e.target.value }))} placeholder="https://..." className="rounded-xl" />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl">Cancel</Button>
                <Button type="submit" disabled={creating} className="flex-1 bg-[#0052CC] hover:bg-[#0747A6] text-white rounded-xl">
                  {creating ? "Creating…" : "Create Workspace"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center"><div className="w-5 h-5 border-2 border-[#0052CC] border-t-transparent rounded-full animate-spin" /></div>}>
      <CustomerWorkspacesContent />
    </Suspense>
  );
}
