"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ShieldCheck, Plus, Save, CheckCircle, AlertTriangle } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";

type SlaTier = {
  id: number;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  label: string;
  responseHrs: number;
  resolutionHrs: number;
  breachAction: string;
  color: string;
  source?: "database" | "default";
};

const INIT_TIERS: SlaTier[] = [
  { id: 1, priority: 'CRITICAL', label: 'Critical', responseHrs: 1, resolutionHrs: 4, breachAction: 'Escalate + SMS alert', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  { id: 2, priority: 'HIGH', label: 'High', responseHrs: 4, resolutionHrs: 24, breachAction: 'Escalate to Lead', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  { id: 3, priority: 'MEDIUM', label: 'Medium', responseHrs: 8, resolutionHrs: 72, breachAction: 'Email notification', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  { id: 4, priority: 'LOW', label: 'Low', responseHrs: 24, resolutionHrs: 168, breachAction: 'Log only', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
];

const INIT_ESCALATION = [
  { id: 1, rule: 'Critical unassigned', trigger: '30+ min without agent', action: 'Auto-assign to lead', channel: 'In-app + email' },
  { id: 2, rule: 'High unassigned', trigger: '2+ hours without agent', action: 'Notify lead', channel: 'In-app + email' },
  { id: 3, rule: 'SLA breached', trigger: 'Deadline passed, still open', action: 'Lead reviews immediately', channel: 'In-app + email' },
  { id: 4, rule: 'Stuck in progress', trigger: 'IN_PROGRESS for 48+ hours', action: 'Lead unblocks', channel: 'In-app + email' },
  { id: 5, rule: 'Systemic pattern', trigger: '3+ same category from customer', action: 'Lead investigates root cause', channel: 'In-app + email' },
];

export default function SLAConfigPage() {
  const router = useRouter();
  const [tiers, setTiers] = useState(INIT_TIERS);
  const [editTier, setEditTier] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [showPerCustomer, setShowPerCustomer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const applyConfig = (config: { tiers?: SlaTier[]; updatedAt?: string | null }) => {
    if (Array.isArray(config.tiers) && config.tiers.length > 0) {
      setTiers(config.tiers);
    }
    setLastSavedAt(config.updatedAt ?? null);
  };

  useEffect(() => {
    let alive = true;
    async function loadConfig() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/sla-config", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load SLA settings");
        const data = await res.json();
        if (alive) applyConfig(data.config);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Failed to load SLA settings");
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadConfig();
    return () => {
      alive = false;
    };
  }, []);

  const updateTier = (id: number, field: string, value: string | number) => {
    setTiers((prev) => prev.map((t) => t.id === id ? { ...t, [field]: value } : t));
  };

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/sla-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiers }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error ?? "Failed to save SLA settings");
      }
      const data = await res.json();
      applyConfig(data.config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save SLA settings");
    } finally {
      setSaving(false);
    }
  };

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
              <span className="text-slate-700 dark:text-slate-300 font-medium">SLA Configuration</span>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              {loading && <span className="text-xs text-slate-500">Loading...</span>}
              {error && <span className="text-xs text-red-600">{error}</span>}
              {saved && <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="w-3.5 h-3.5" />Saved</span>}
              <Button onClick={save} disabled={saving || loading} className="h-8 text-xs bg-[#0052CC] hover:bg-[#0747A6] text-white px-3 disabled:opacity-60">
                <Save className="w-3.5 h-3.5 mr-1.5" />{saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {(formatSavedAt || tiers.some((tier) => tier.source === "database")) && (
            <div className="bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-4 py-2 text-xs flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Live SLA tiers are persisted.</span>
              {formatSavedAt && <span>Last updated on {formatSavedAt}</span>}
            </div>
          )}

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
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${tier.color}`}>{tier.label}</span>
                          {tier.source === "default" && (
                            <span className="text-[10px] font-medium text-slate-400">default</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {editTier === tier.id ? (
                          <div className="flex items-center gap-1">
                            <input type="number" min={1} value={tier.responseHrs}
                              onChange={(e) => updateTier(tier.id, 'responseHrs', Math.max(1, Math.min(720, parseInt(e.target.value) || 1)))}
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
                              onChange={(e) => updateTier(tier.id, 'resolutionHrs', Math.max(1, Math.min(720, parseInt(e.target.value) || 1)))}
                              className="w-16 text-sm px-2 py-1 border border-[#0052CC] rounded focus:outline-none" />
                            <span className="text-xs text-slate-500">hrs</span>
                          </div>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{tier.resolutionHrs}h</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-slate-600 dark:text-slate-400 text-xs">{tier.breachAction}</span>
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
              {INIT_ESCALATION.map((rule) => (
                <div key={rule.id} className="px-5 py-4 grid grid-cols-4 gap-4 items-center">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Rule</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{rule.rule}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">When</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{rule.trigger}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Action</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{rule.action}</p>
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
