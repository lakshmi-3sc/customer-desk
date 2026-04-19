"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Bot, Zap, ToggleLeft, ToggleRight, Info, AlertTriangle, CheckCircle, ChevronDown } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";

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
  const [suggestedResponses, setSuggestedResponses] = useState(true);
  const [resolutionPrediction, setResolutionPrediction] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [minSimilarity, setMinSimilarity] = useState(60);
  const [routingRules, setRoutingRules] = useState(INIT_ROUTING_RULES);
  const [editingRule, setEditingRule] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const saveSettings = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const updateRule = (id: number, field: string, value: string | number) => {
    setRoutingRules((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
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
              {saved && <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="w-3.5 h-3.5" />Saved</span>}
              <Button onClick={saveSettings} className="h-8 text-xs bg-[#0052CC] hover:bg-[#0747A6] text-white px-3">Save Settings</Button>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">

            {/* Auto-classification */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Auto-Classification</h3>
                </div>
                <button onClick={() => setAutoClassify(!autoClassify)} className="text-slate-400 hover:text-[#0052CC] transition-colors">
                  {autoClassify ? <ToggleRight className="w-6 h-6 text-[#0052CC]" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Automatically classify incoming issues by category and priority using AI.
              </p>
              <div className={`text-xs px-2 py-1 rounded font-medium inline-flex items-center gap-1 ${autoClassify ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {autoClassify ? <><CheckCircle className="w-3 h-3" />Enabled</> : 'Disabled'}
              </div>
              {autoClassify && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">
                    Confidence Threshold — <span className="text-[#0052CC]">{confidenceThreshold}%</span>
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
                <button onClick={() => setSuggestedResponses(!suggestedResponses)} className="text-slate-400 hover:text-[#0052CC] transition-colors">
                  {suggestedResponses ? <ToggleRight className="w-6 h-6 text-[#0052CC]" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Surface KB article suggestions to agents when replying to issues.
              </p>
              <div className={`text-xs px-2 py-1 rounded font-medium inline-flex items-center gap-1 ${suggestedResponses ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {suggestedResponses ? <><CheckCircle className="w-3 h-3" />Enabled</> : 'Disabled'}
              </div>
              {suggestedResponses && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">
                    Min Similarity Score — <span className="text-[#0052CC]">{minSimilarity}%</span>
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
                <button onClick={() => setResolutionPrediction(!resolutionPrediction)} className="text-slate-400 hover:text-[#0052CC] transition-colors">
                  {resolutionPrediction ? <ToggleRight className="w-6 h-6 text-[#0052CC]" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Predict estimated resolution time for new issues based on historical data.
              </p>
              <div className={`text-xs px-2 py-1 rounded font-medium inline-flex items-center gap-1 ${resolutionPrediction ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {resolutionPrediction ? <><CheckCircle className="w-3 h-3" />Active</> : 'Disabled'}
              </div>
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
                <button className="text-xs text-[#0052CC] hover:underline mt-1">Trigger retraining →</button>
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
