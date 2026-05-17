"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Bot, Zap, Info, AlertTriangle, CheckCircle, Sparkles, Route, Search, ShieldCheck } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";

type RoutingRule = {
  id: number;
  category: string;
  skill: string;
  confidence: number;
  agent: string;
};

type AiConfig = {
  autoClassify: boolean;
  autoAssign: boolean;
  suggestedResponses: boolean;
  resolutionPrediction: boolean;
  resolutionCopilot: boolean;
  semanticSearch: boolean;
  confidenceThreshold: number;
  similarityThreshold: number;
  autoApplyThreshold: number;
  manualReviewThreshold: number;
  routingRules: RoutingRule[];
  updatedByName?: string | null;
  updatedAt?: string | null;
};

const INIT_ROUTING_RULES = [
  { id: 1, category: 'BUG', skill: 'Technical Support', confidence: 88, agent: 'Auto-assign' },
  { id: 2, category: 'BILLING', skill: 'Billing & Accounts', confidence: 92, agent: 'Auto-assign' },
  { id: 3, category: 'FEATURE_REQUEST', skill: 'Product Feedback', confidence: 79, agent: 'Route to Lead' },
  { id: 4, category: 'DELIVERY', skill: 'Logistics Support', confidence: 95, agent: 'Auto-assign' },
  { id: 5, category: 'GENERAL', skill: 'General Helpdesk', confidence: 85, agent: 'Auto-assign' },
  { id: 6, category: 'TECHNICAL', skill: 'Technical Support', confidence: 90, agent: 'Auto-assign' },
];

const FLAGGED = [
  { id: 1, ticket: 'TKT-1042', title: 'API rate limit exceeded on endpoint', confidence: 48, suggested: 'Technical Support', time: '2h ago' },
  { id: 2, ticket: 'TKT-1038', title: 'Invoice amount mismatch', confidence: 52, suggested: 'Billing & Accounts', time: '4h ago' },
  { id: 3, ticket: 'TKT-1035', title: "Can't access dashboard after migration", confidence: 44, suggested: 'Technical Support', time: '6h ago' },
];

export default function AIConfigPage() {
  const router = useRouter();
  const [autoClassify, setAutoClassify] = useState(true);
  const [autoAssign, setAutoAssign] = useState(true);
  const [suggestedResponses, setSuggestedResponses] = useState(true);
  const [resolutionPrediction, setResolutionPrediction] = useState(true);
  const [resolutionCopilot, setResolutionCopilot] = useState(true);
  const [semanticSearch, setSemanticSearch] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [minSimilarity, setMinSimilarity] = useState(60);
  const [autoApplyThreshold, setAutoApplyThreshold] = useState(80);
  const [manualReviewThreshold, setManualReviewThreshold] = useState(60);
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>(INIT_ROUTING_RULES);
  const [editingRule, setEditingRule] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedBy, setLastSavedBy] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const applyConfig = (config: AiConfig) => {
    setAutoClassify(config.autoClassify);
    setAutoAssign(config.autoAssign);
    setSuggestedResponses(config.suggestedResponses);
    setResolutionPrediction(config.resolutionPrediction);
    setResolutionCopilot(config.resolutionCopilot);
    setSemanticSearch(config.semanticSearch);
    setConfidenceThreshold(config.confidenceThreshold);
    setMinSimilarity(config.similarityThreshold);
    setAutoApplyThreshold(config.autoApplyThreshold);
    setManualReviewThreshold(config.manualReviewThreshold);
    if (Array.isArray(config.routingRules) && config.routingRules.length > 0) {
      setRoutingRules(config.routingRules);
    }
    setLastSavedBy(config.updatedByName ?? null);
    setLastSavedAt(config.updatedAt ?? null);
  };

  useEffect(() => {
    let alive = true;
    async function loadSettings() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/ai-config", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load AI settings");
        const data = await res.json();
        if (alive) applyConfig(data.config);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Failed to load AI settings");
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadSettings();
    return () => {
      alive = false;
    };
  }, []);

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/ai-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoClassify,
          autoAssign,
          suggestedResponses,
          resolutionPrediction,
          resolutionCopilot,
          semanticSearch,
          confidenceThreshold,
          similarityThreshold: minSimilarity,
          autoApplyThreshold,
          manualReviewThreshold,
          routingRules,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error ?? "Failed to save AI settings");
      }
      const data = await res.json();
      applyConfig(data.config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save AI settings");
    } finally {
      setSaving(false);
    }
  };

  const updateRule = (id: number, field: string, value: string | number) => {
    setRoutingRules((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  const configSwitch = (checked: boolean, onChange: () => void) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`group inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/25 ${
        checked
          ? "border-[#0052CC] bg-[#0052CC] shadow-sm shadow-blue-200"
          : "border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800"
      }`}
    >
      <span
        className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );

  const formatSavedAt = lastSavedAt
    ? new Date(lastSavedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F8F9FB] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => router.push('/admin')} className="text-[#0052CC] dark:text-blue-400 hover:underline font-medium">Admin</button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">AI Configuration</span>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              {loading && <span className="text-xs text-slate-500">Loading...</span>}
              {error && <span className="text-xs text-red-600">{error}</span>}
              {saved && <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="w-3.5 h-3.5" />Saved</span>}
              <Button onClick={saveSettings} disabled={saving || loading} className="h-8 text-xs bg-[#0052CC] hover:bg-[#0747A6] text-white px-3 disabled:opacity-60">
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {(lastSavedBy || formatSavedAt) && (
            <div className="bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-4 py-2 text-xs flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Live AI settings are persisted.</span>
              {lastSavedBy && <span>Last updated by {lastSavedBy}</span>}
              {formatSavedAt && <span>on {formatSavedAt}</span>}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">

            {/* Auto-classification */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Auto-Classification</h3>
                </div>
                {configSwitch(autoClassify, () => setAutoClassify(!autoClassify))}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Automatically classify incoming issues by category and priority using AI.
              </p>
              {autoClassify && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">
                    Confidence Threshold - <span className="text-[#0052CC]">{confidenceThreshold}%</span>
                  </label>
                  <input type="range" min={40} max={95} value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                    className="w-full accent-[#0052CC]" />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>40% (permissive)</span><span>95% (strict)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Issues below threshold are flagged for manual review.
                  </p>
                </div>
              )}
            </div>

            {/* Suggested Responses */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Suggested Responses</h3>
                </div>
                {configSwitch(suggestedResponses, () => setSuggestedResponses(!suggestedResponses))}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Surface KB article suggestions to agents when replying to issues.
              </p>
              {suggestedResponses && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">
                    Min Similarity Score - <span className="text-[#0052CC]">{minSimilarity}%</span>
                  </label>
                  <input type="range" min={30} max={95} value={minSimilarity}
                    onChange={(e) => setMinSimilarity(parseInt(e.target.value))}
                    className="w-full accent-[#0052CC]" />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>30% (more results)</span><span>95% (exact match)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Resolution Prediction */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Resolution Prediction</h3>
                </div>
                {configSwitch(resolutionPrediction, () => setResolutionPrediction(!resolutionPrediction))}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Predict estimated resolution time for new issues based on historical data.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Model status</span>
                  <span className="text-emerald-600 font-medium">Ready</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Last retrained</span>
                  <span className="text-slate-700 dark:text-slate-300">18 Apr 2026</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Accuracy</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">91.3%</span>
                </div>
                <button className="text-xs text-[#0052CC] hover:underline mt-1">Trigger retraining</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Smart Auto-Assign</h3>
                </div>
                {configSwitch(autoAssign, () => setAutoAssign(!autoAssign))}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Assign new tickets to the best matching agent when confidence is high.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Resolution Copilot</h3>
                </div>
                {configSwitch(resolutionCopilot, () => setResolutionCopilot(!resolutionCopilot))}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Collect diagnostics before ticket creation and attach the package for agents.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Semantic Search</h3>
                </div>
                {configSwitch(semanticSearch, () => setSemanticSearch(!semanticSearch))}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Use vector similarity for resolved ticket and knowledge base suggestions.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Review Policy</h3>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                  Auto apply above <span className="text-[#0052CC]">{autoApplyThreshold}%</span>
                </label>
                <input type="range" min={50} max={95} value={autoApplyThreshold}
                  onChange={(e) => setAutoApplyThreshold(parseInt(e.target.value))}
                  className="w-full accent-[#0052CC]" />
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                  Manual review below <span className="text-[#0052CC]">{manualReviewThreshold}%</span>
                </label>
                <input type="range" min={20} max={80} value={manualReviewThreshold}
                  onChange={(e) => setManualReviewThreshold(parseInt(e.target.value))}
                  className="w-full accent-[#0052CC]" />
              </div>
            </div>
          </div>

          {/* Routing rules */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Intelligent Routing Rules</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Map issue categories to agent skill sets for automatic routing.</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {['Category', 'Agent Skill', 'Confidence', 'Assignment', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {routingRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-medium">{rule.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      {editingRule === rule.id ? (
                        <input value={rule.skill} onChange={(e) => updateRule(rule.id, 'skill', e.target.value)}
                          className="text-sm px-2 py-1 border border-[#0052CC] rounded w-full focus:outline-none" />
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300">{rule.skill}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${rule.confidence >= 80 ? 'bg-emerald-500' : rule.confidence >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${rule.confidence}%` }} />
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400">{rule.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editingRule === rule.id ? (
                        <select value={rule.agent} onChange={(e) => updateRule(rule.id, 'agent', e.target.value)}
                          className="text-sm px-2 py-1 border border-[#0052CC] rounded focus:outline-none">
                          <option>Auto-assign</option>
                          <option>Route to Lead</option>
                          <option>Manual queue</option>
                        </select>
                      ) : (
                        <span className="text-xs text-slate-600 dark:text-slate-400">{rule.agent}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingRule === rule.id ? (
                        <button onClick={() => setEditingRule(null)}
                          className="text-xs px-2 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600">Save</button>
                      ) : (
                        <button onClick={() => setEditingRule(rule.id)}
                          className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Flagged AI decisions */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Flagged Low-Confidence Decisions</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">AI routing decisions that need human review</p>
              </div>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {FLAGGED.map((f) => (
                <div key={f.id} className="px-5 py-3 flex items-center gap-4">
                  <span className="font-mono text-xs font-bold text-[#0052CC]">{f.ticket}</span>
                  <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">{f.title}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1.5 bg-amber-200 dark:bg-amber-900 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${f.confidence}%` }} />
                    </div>
                    <span className="text-xs text-amber-600 font-medium">{f.confidence}%</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{f.suggested}</span>
                  <span className="text-xs text-slate-400">{f.time}</span>
                  <div className="flex gap-1.5">
                    <button className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors">Accept</button>
                    <button className="text-xs px-2 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded hover:bg-slate-200 transition-colors">Override</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
