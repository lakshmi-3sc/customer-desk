"use client";

import { useState } from "react";
import {
  Building2, Bell, ShieldAlert, Palette, Save, CheckCircle,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";

type Tab = "workspace" | "notifications" | "escalation" | "appearance";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "workspace", label: "Workspace", icon: Building2 },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "escalation", label: "Escalation", icon: ShieldAlert },
  { key: "appearance", label: "Appearance", icon: Palette },
];

function SaveBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
      <CheckCircle className="w-4 h-4" />
      Settings saved (UI only — persistence coming soon)
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("workspace");
  const [saved, setSaved] = useState(false);

  // Workspace settings state
  const [companyName, setCompanyName] = useState(
    session?.user?.name?.split(" ").slice(0, -1).join(" ") ?? "My Company"
  );
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0052CC");

  // Notification settings
  const [notifPrefs, setNotifPrefs] = useState({
    newTicket: true,
    statusChange: true,
    comment: true,
    slaBreach: true,
    weeklyReport: false,
  });

  // Escalation settings
  const [escalationContacts, setEscalationContacts] = useState([
    { name: "", email: "", phone: "" },
  ]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleNotif = (key: keyof typeof notifPrefs) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const addContact = () => {
    setEscalationContacts((prev) => [...prev, { name: "", email: "", phone: "" }]);
  };

  const updateContact = (i: number, field: string, value: string) => {
    setEscalationContacts((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c))
    );
  };

  const removeContact = (i: number) => {
    setEscalationContacts((prev) => prev.filter((_, idx) => idx !== i));
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">Settings</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Workspace configuration</p>
            </div>
          }
          right={
            <Button
              size="sm"
              onClick={handleSave}
              className="h-7 text-xs bg-[#0052CC] hover:bg-[#0747A6] text-white gap-1.5"
            >
              <Save className="w-3 h-3" />
              Save changes
            </Button>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-6">
              {/* Sidebar tabs */}
              <nav className="w-44 flex-shrink-0 space-y-0.5">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === tab.key
                          ? "bg-[#0052CC] text-white"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>

              {/* Content */}
              <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">

                {/* Workspace */}
                {activeTab === "workspace" && (
                  <div className="space-y-5">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
                      Workspace Branding
                    </h2>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Company / Workspace Name
                        </Label>
                        <Input
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Acme Corp"
                          className="text-sm max-w-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Logo URL
                        </Label>
                        <Input
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          placeholder="https://example.com/logo.png"
                          className="text-sm max-w-sm"
                        />
                        {logoUrl && (
                          <img
                            src={logoUrl}
                            alt="Logo preview"
                            className="mt-2 h-10 object-contain rounded border border-slate-200 dark:border-slate-700 p-1"
                          />
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Primary Brand Color
                        </Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="w-10 h-8 rounded cursor-pointer border border-slate-200 dark:border-slate-700"
                          />
                          <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                            {primaryColor}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications */}
                {activeTab === "notifications" && (
                  <div className="space-y-5">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
                      Notification Preferences
                    </h2>
                    <div className="space-y-3">
                      {[
                        { key: "newTicket" as const, label: "New ticket created", desc: "When a team member raises a new issue" },
                        { key: "statusChange" as const, label: "Status changes", desc: "When a ticket status is updated" },
                        { key: "comment" as const, label: "New comments", desc: "When someone replies on your ticket" },
                        { key: "slaBreach" as const, label: "SLA breach alerts", desc: "When an issue is at risk of or has breached SLA" },
                        { key: "weeklyReport" as const, label: "Weekly report digest", desc: "Summary email every Monday morning" },
                      ].map((pref) => (
                        <div
                          key={pref.key}
                          className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800 last:border-0"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {pref.label}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{pref.desc}</p>
                          </div>
                          <button
                            onClick={() => toggleNotif(pref.key)}
                            className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none ${
                              notifPrefs[pref.key]
                                ? "bg-[#0052CC]"
                                : "bg-slate-300 dark:bg-slate-600"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                notifPrefs[pref.key] ? "left-5.5 translate-x-0.5" : "left-0.5"
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Escalation */}
                {activeTab === "escalation" && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Escalation Contacts
                      </h2>
                      <Button variant="outline" size="sm" onClick={addContact} className="h-7 text-xs">
                        + Add contact
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      These contacts will be notified when a critical issue is escalated or SLA is breached.
                    </p>
                    <div className="space-y-4">
                      {escalationContacts.map((contact, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                              Contact {i + 1}
                            </p>
                            {escalationContacts.length > 1 && (
                              <button
                                onClick={() => removeContact(i)}
                                className="text-xs text-red-500 hover:text-red-700"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500">Full Name</Label>
                              <Input
                                value={contact.name}
                                onChange={(e) => updateContact(i, "name", e.target.value)}
                                placeholder="Jane Smith"
                                className="text-sm h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500">Email</Label>
                              <Input
                                type="email"
                                value={contact.email}
                                onChange={(e) => updateContact(i, "email", e.target.value)}
                                placeholder="jane@company.com"
                                className="text-sm h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500">Phone (optional)</Label>
                              <Input
                                value={contact.phone}
                                onChange={(e) => updateContact(i, "phone", e.target.value)}
                                placeholder="+44 7700 000000"
                                className="text-sm h-8"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Appearance */}
                {activeTab === "appearance" && (
                  <div className="space-y-5">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
                      Appearance
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Use the theme switcher in the sidebar to toggle between light and dark mode.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {["Light", "Dark"].map((theme) => (
                        <div
                          key={theme}
                          className={`rounded-lg border-2 ${
                            theme === "Light"
                              ? "border-[#0052CC] bg-white"
                              : "border-slate-700 bg-slate-900"
                          } p-4 cursor-pointer`}
                        >
                          <div
                            className={`text-sm font-medium ${
                              theme === "Light" ? "text-slate-900" : "text-white"
                            }`}
                          >
                            {theme} Mode
                          </div>
                          <div
                            className={`text-xs mt-1 ${
                              theme === "Light" ? "text-slate-500" : "text-slate-400"
                            }`}
                          >
                            {theme === "Light"
                              ? "Clean white interface"
                              : "Easier on the eyes at night"}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Sidebar density
                      </Label>
                      <select className="text-sm border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0052CC]">
                        <option value="default">Default</option>
                        <option value="compact">Compact</option>
                        <option value="comfortable">Comfortable</option>
                      </select>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </main>
      </div>
      <SaveBanner visible={saved} />
    </div>
  );
}
