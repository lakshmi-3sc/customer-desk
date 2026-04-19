"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  AlertTriangle,
  MessageSquare,
  Info,
  ChevronRight,
  CheckCheck,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { cn } from "@/lib/utils";

const TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  status_change: { icon: Info, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-950", label: "Status Update" },
  field_change: { icon: Info, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800", label: "Field Update" },
  comment: { icon: MessageSquare, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-950", label: "New Reply" },
  sla: { icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950", label: "SLA Alert" },
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const ids = new Set<string>(
      JSON.parse(typeof window !== "undefined" ? (localStorage.getItem("notif-read") ?? "[]") : "[]")
    );
    setReadIds(ids);

    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => setNotifications(data.notifications ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = () => {
    const ids = new Set(notifications.map((n) => n.id));
    localStorage.setItem("notif-read", JSON.stringify([...ids]));
    setReadIds(ids);
  };

  const markRead = (id: string) => {
    const newIds = new Set([...readIds, id]);
    localStorage.setItem("notif-read", JSON.stringify([...newIds]));
    setReadIds(newIds);
  };

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  // Group by date
  const grouped: Record<string, any[]> = {};
  for (const n of notifications) {
    const d = new Date(n.createdAt);
    const now = new Date();
    let label: string;
    if (d.toDateString() === now.toDateString()) {
      label = "Today";
    } else {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      label = d.toDateString() === yesterday.toDateString()
        ? "Yesterday"
        : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    }
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(n);
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <nav className="flex items-center gap-1.5 text-sm">
              <button onClick={() => router.push("/dashboard")} className="text-[#0052CC] hover:underline">Dashboard</button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400 font-semibold">Notifications</span>
            </nav>
          }
          right={
            unreadCount > 0 ? (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0052CC] dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            ) : undefined
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {loading ? "Loading…" : unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-base font-semibold text-slate-500 dark:text-slate-400">No notifications</p>
                <p className="text-sm text-slate-400 mt-1">We'll notify you when something happens with your issues</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(grouped).map(([dateLabel, items]) => (
                  <div key={dateLabel}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">{dateLabel}</p>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-50 dark:divide-slate-800">
                      {items.map((n) => {
                        const isUnread = !readIds.has(n.id);
                        const meta = TYPE_META[n.type] ?? TYPE_META.field_change;
                        const Icon = meta.icon;
                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              markRead(n.id);
                              router.push(`/tickets/${n.issueKey ?? n.issueId}`);
                            }}
                            className={cn(
                              "flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                              isUnread && "bg-blue-50/40 dark:bg-blue-950/20"
                            )}
                          >
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${meta.bg}`}>
                              <Icon className={`w-4 h-4 ${meta.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${meta.color}`}>{meta.label}</span>
                                    {n.issueKey && (
                                      <span className="text-[10px] font-mono text-slate-400">{n.issueKey}</span>
                                    )}
                                  </div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5 leading-snug">
                                    {n.title}
                                  </p>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{n.body}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                  {isUnread && <span className="w-2 h-2 rounded-full bg-[#0052CC]" />}
                                  <p className="text-[10px] text-slate-400 whitespace-nowrap">
                                    {new Date(n.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
