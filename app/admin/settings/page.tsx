"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, Settings, Mail, Globe, Palette, Webhook, Key,
  Save, CheckCircle, Plus, Trash2, Eye, EyeOff, Copy, RefreshCw,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TABS = [
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'email', label: 'Email Templates', icon: Mail },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'api-keys', label: 'API Keys', icon: Key },
];

const EMAIL_TEMPLATES = [
  { id: 'ticket_created', label: 'Ticket Created', subject: 'Your issue #{ticketKey} has been received', preview: 'Hi {name}, we\'ve received your support request...' },
  { id: 'status_update', label: 'Status Update', subject: 'Update on #{ticketKey}: {status}', preview: 'Your issue status has been updated to {status}...' },
  { id: 'sla_warning', label: 'SLA Warning', subject: 'Action required: #{ticketKey} approaching SLA deadline', preview: 'Your issue is approaching its SLA response deadline...' },
  { id: 'resolved', label: 'Issue Resolved', subject: '#{ticketKey} has been resolved', preview: 'Great news! Your issue has been resolved...' },
];

const MOCK_WEBHOOKS = [
  { id: 1, url: 'https://hooks.slack.com/services/xxx', events: ['ticket.created', 'ticket.resolved'], active: true },
  { id: 2, url: 'https://api.novatech.com/webhooks/support', events: ['status.changed'], active: false },
];

const MOCK_KEYS = [
  { id: 1, name: 'Production API Key', key: 'sk_live_••••••••••••••••••••kx9f', created: '2026-01-10', lastUsed: '2 hours ago' },
  { id: 2, name: 'Dev / Testing Key', key: 'sk_test_••••••••••••••••••••m3dk', created: '2026-03-01', lastUsed: '5 days ago' },
];

export default function SystemSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('branding');
  const [saved, setSaved] = useState(false);
  const [portalName, setPortalName] = useState('3SC Connect');
  const [primaryColor, setPrimaryColor] = useState('#0052CC');
  const [logoUrl, setLogoUrl] = useState('');
  const [editTemplate, setEditTemplate] = useState<string | null>(null);
  const [templateSubject, setTemplateSubject] = useState('');
  const [webhooks, setWebhooks] = useState(MOCK_WEBHOOKS);
  const [apiKeys, setApiKeys] = useState(MOCK_KEYS);
  const [showKey, setShowKey] = useState<number | null>(null);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [copied, setCopied] = useState<number | null>(null);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const copyKey = (id: number) => {
    setCopied(id); setTimeout(() => setCopied(null), 2000);
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
              <span className="text-slate-700 dark:text-slate-300 font-medium">System Settings</span>
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

        <div className="flex-1 flex overflow-hidden">
          {/* Tab sidebar */}
          <div className="w-48 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${activeTab === id ? 'bg-[#0052CC] text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {activeTab === 'branding' && (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Branding</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Customise the portal name, logo, and theme colour.</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Portal Name</Label>
                    <Input value={portalName} onChange={(e) => setPortalName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Logo URL</Label>
                    <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
                    <p className="text-xs text-slate-400">Recommended: 200×60px PNG or SVG with transparent background</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Primary Theme Colour</Label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded border border-slate-200 dark:border-slate-700 cursor-pointer" />
                      <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
                        className="font-mono w-32" />
                      <div className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700" style={{ backgroundColor: primaryColor }} />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ backgroundColor: primaryColor }}>
                        {portalName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{portalName || 'Portal Name'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'email' && (
              <div className="max-w-2xl space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Email Templates</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Customise notification emails. Use &#123;variable&#125; placeholders.</p>
                </div>
                {EMAIL_TEMPLATES.map((t) => (
                  <div key={t.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t.label}</p>
                        {editTemplate === t.id ? (
                          <div className="mt-3 space-y-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500">Subject</Label>
                              <Input value={templateSubject || t.subject} onChange={(e) => setTemplateSubject(e.target.value)} className="text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500">Body preview</Label>
                              <textarea defaultValue={t.preview} rows={4}
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0052CC] resize-none" />
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => setEditTemplate(null)} className="h-8 text-xs">Cancel</Button>
                              <Button onClick={() => setEditTemplate(null)} className="h-8 text-xs bg-[#0052CC] hover:bg-[#0747A6] text-white">Save Template</Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">{t.subject}</p>
                        )}
                      </div>
                      {editTemplate !== t.id && (
                        <button onClick={() => { setEditTemplate(t.id); setTemplateSubject(t.subject); }}
                          className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'webhooks' && (
              <div className="max-w-2xl space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Webhooks</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Receive real-time HTTP callbacks for platform events.</p>
                  </div>
                </div>
                {webhooks.map((wh) => (
                  <div key={wh.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate">{wh.url}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {wh.events.map((ev) => (
                            <span key={ev} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded font-mono">{ev}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${wh.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {wh.active ? 'Active' : 'Inactive'}
                        </span>
                        <button onClick={() => setWebhooks((p) => p.filter((w) => w.id !== wh.id))}
                          className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Add Webhook Endpoint</p>
                  <div className="flex gap-2">
                    <Input value={newWebhookUrl} onChange={(e) => setNewWebhookUrl(e.target.value)}
                      placeholder="https://your-endpoint.com/webhook" className="flex-1 text-sm" />
                    <Button onClick={() => {
                      if (newWebhookUrl) { setWebhooks((p) => [...p, { id: Date.now(), url: newWebhookUrl, events: ['ticket.created'], active: true }]); setNewWebhookUrl(''); }
                    }} className="bg-[#0052CC] hover:bg-[#0747A6] text-white text-xs h-9 px-3">
                      <Plus className="w-3.5 h-3.5 mr-1" />Add
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api-keys' && (
              <div className="max-w-2xl space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">API Keys</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Manage API keys for integrations. Keep keys secret — treat like passwords.</p>
                </div>
                {apiKeys.map((k) => (
                  <div key={k.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{k.name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <code className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">
                            {showKey === k.id ? k.key.replace(/•/g, 'x') : k.key}
                          </code>
                          <button onClick={() => setShowKey(showKey === k.id ? null : k.id)} className="text-slate-400 hover:text-slate-600">
                            {showKey === k.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => copyKey(k.id)} className="text-slate-400 hover:text-[#0052CC]">
                            {copied === k.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-slate-400">
                          <span>Created {k.created}</span>
                          <span>Last used {k.lastUsed}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="text-xs px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:bg-slate-50">
                          <RefreshCw className="w-3 h-3" />Rotate
                        </button>
                        <button onClick={() => setApiKeys((p) => p.filter((key) => key.id !== k.id))}
                          className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
                <button className="flex items-center gap-2 text-sm text-[#0052CC] hover:underline font-medium">
                  <Plus className="w-4 h-4" />Generate new API key
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
