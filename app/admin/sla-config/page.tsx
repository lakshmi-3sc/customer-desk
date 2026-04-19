"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ShieldCheck, Plus, Save, CheckCircle, AlertTriangle, X } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";

const INIT_TIERS = [
  { id: 1, priority: 'CRITICAL', label: 'Critical', responseHrs: 1, resolutionHrs: 4, breachAction: 'Escalate + SMS alert', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  { id: 2, priority: 'HIGH', label: 'High', responseHrs: 4, resolutionHrs: 24, breachAction: 'Escalate to Lead', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  { id: 3, priority: 'MEDIUM', label: 'Medium', responseHrs: 8, resolutionHrs: 48, breachAction: 'Email notification', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  { id: 4, priority: 'LOW', label: 'Low', responseHrs: 24, resolutionHrs: 72, breachAction: 'Log only', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
];

const INIT_ESCALATION = [
  { id: 1, trigger: 'SLA breached', notifyRole: '3SC Lead', afterMins: 0, channel: 'Email + In-app' },
  { id: 2, trigger: 'No response in 2h (Critical)', notifyRole: '3SC Admin', afterMins: 120, channel: 'SMS + Email' },
  { id: 3, trigger: 'SLA at risk (75%)', notifyRole: '3SC Agent', afterMins: 0, channel: 'In-app' },
];

export default function SLAConfigPage() {
  const router = useRouter();
  const [tiers, setTiers] = useState(INIT_TIERS);
  const [escalation, setEscalation] = useState(INIT_ESCALATION);
  const [editTier, setEditTier] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [showPerCustomer, setShowPerCustomer] = useState(false);

  const updateTier = (id: number, field: string, value: string | number) => {
    setTiers((prev) => prev.map((t) => t.id === id ? { ...t, [field]: value } : t));
  };

  const updateEscalation = (id: number, field: string, value: string | number) => {
    setEscalation((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => router.push('/admin')} className="text-[#0052CC] dark:text-blue-400 hover:underline font-medium">Admin</button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">SLA Configuration</span>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              {saved && <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="w-3.5 h-3.5" />Saved</span>}
              <Button onClick={save} className="h-8 text-xs bg-[#0052CC] hover:bg-[#0747A6] text-white px-3">
                <Save className="w-3.5 h-3.5 mr-1.5" />Save Changes
              </Button>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SLA tiers */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">SLA Tiers</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Response and resolution time targets by priority</p>
              </div>
              <ShieldCheck className="w-4 h-4 text-slate-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {['Priority', 'First Response', 'Resolution Time', 'Breach Action', 'Edit'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {tiers.map((tier) => (
                    <tr key={tier.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2 py-1 rounded font-semibold ${tier.color}`}>{tier.label}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {editTier === tier.id ? (
                          <div className="flex items-center gap-1">
                            <input type="number" min={1} value={tier.responseHrs}
                              onChange={(e) => updateTier(tier.id, 'responseHrs', parseInt(e.target.value) || 1)}
                              className="w-16 text-sm px-2 py-1 border border-[#0052CC] rounded focus:outline-none" />
                            <span className="text-xs text-slate-500">hrs</span>
                          </div>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{tier.responseHrs}h</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {editTier === tier.id ? (
                          <div className="flex items-center gap-1">
                            <input type="number" min={1} value={tier.resolutionHrs}
                              onChange={(e) => updateTier(tier.id, 'resolutionHrs', parseInt(e.target.value) || 1)}
                              className="w-16 text-sm px-2 py-1 border border-[#0052CC] rounded focus:outline-none" />
                            <span className="text-xs text-slate-500">hrs</span>
                          </div>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{tier.resolutionHrs}h</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {editTier === tier.id ? (
                          <input value={tier.breachAction} onChange={(e) => updateTier(tier.id, 'breachAction', e.target.value)}
                            className="text-sm px-2 py-1 border border-[#0052CC] rounded w-full focus:outline-none" />
                        ) : (
                          <span className="text-slate-600 dark:text-slate-400 text-xs">{tier.breachAction}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {editTier === tier.id ? (
                          <button onClick={() => setEditTier(null)}
                            className="text-xs px-2 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600">Done</button>
                        ) : (
                          <button onClick={() => setEditTier(tier.id)}
                            className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Edit</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Escalation rules */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Escalation Rules</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Automatic escalation triggers and notification routing</p>
              </div>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {escalation.map((rule) => (
                <div key={rule.id} className="px-5 py-4 grid grid-cols-4 gap-4 items-center">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Trigger</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{rule.trigger}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Notify</p>
                    <select value={rule.notifyRole} onChange={(e) => updateEscalation(rule.id, 'notifyRole', e.target.value)}
                      className="text-sm px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052CC]">
                      <option>3SC Agent</option>
                      <option>3SC Lead</option>
                      <option>3SC Admin</option>
                      <option>Client Admin</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Delay</p>
                    <div className="flex items-center gap-1">
                      <input type="number" min={0} value={rule.afterMins}
                        onChange={(e) => updateEscalation(rule.id, 'afterMins', parseInt(e.target.value) || 0)}
                        className="w-16 text-sm px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC]" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">mins</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Channel</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{rule.channel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-customer SLA override */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Per-Customer SLA Overrides</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Apply custom SLA targets for specific enterprise customers</p>
              </div>
              <Button variant="outline" onClick={() => setShowPerCustomer(!showPerCustomer)} className="h-8 text-xs">
                {showPerCustomer ? 'Hide' : 'Manage Overrides'}
              </Button>
            </div>
            {showPerCustomer && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No custom overrides configured. Enterprise plan customers can receive bespoke SLA targets.
                </p>
                <button className="mt-3 flex items-center gap-1.5 mx-auto text-xs text-[#0052CC] hover:underline font-medium">
                  <Plus className="w-3.5 h-3.5" />Add customer override
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
