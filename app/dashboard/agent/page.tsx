"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  Bot,
  CheckCircle,
  ChevronRight,
  Clock,
  RefreshCw,
  ShieldAlert,
  Timer,
  Zap,
  Search,
  X,
  MoreVertical,
  MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";

interface IssueItem {
  id: string;
  ticketKey: string | null;
  title: string;
  status: string;
  priority: string;
  slaBreached: boolean;
  slaBreachRisk?: boolean;
  slaDueAt: string | null;
  updatedAt: string;
  client: { name: string };
}

interface AiInsight {
  id: string;
  ticketKey: string | null;
  title: string;
  waitHours: number;
  priority: string;
  client: { name: string };
  type: "ai_draft" | "sla_breach" | "sla_risk" | "follow_up";
  message: string;
  source: string;
}

interface AgentStats {
  kpis: {
    assigned: number;
    overdue: number;
    resolvedToday: number;
    slaBreaches: number;
    pendingResponse: number;
    avgResponseHrs: number;
  };
  recentIssues: IssueItem[];
  priorityQueue: IssueItem[];
  upcomingBreaches: IssueItem[];
  aiInsights: AiInsight[];
}

const STATUS_MAP: Record<string, string> = {
  OPEN: "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900",
  ACKNOWLEDGED: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  IN_PROGRESS: "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
  CLOSED: "bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
};

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-amber-500",
  MEDIUM: "bg-blue-400",
  LOW: "bg-slate-300",
};

const PRIORITY_BORDER: Record<string, string> = {
  CRITICAL: "border-l-red-500",
  HIGH: "border-l-amber-400",
  MEDIUM: "border-l-blue-400",
  LOW: "border-l-slate-300",
};

// Helper function to get activity time display and color
function getActivityTimeInfo(updatedAt: string, nowMs: number): { text: string; color: string } {
  const diffMs = nowMs - new Date(updatedAt).getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);

  if (minutes < 60) {
    return { text: `${minutes}m ago`, color: "text-emerald-600 dark:text-emerald-400" };
  } else if (hours < 6) {
    return { text: `${hours}h ago`, color: "text-amber-600 dark:text-amber-400" };
  } else {
    return { text: `${hours}h ago`, color: "text-red-600 dark:text-red-400" };
  }
}

// SearchFilterBar component
function SearchFilterBar({
  items,
  onFilter,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
}: {
  items: IssueItem[];
  onFilter: (filtered: IssueItem[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  priorityFilter: string;
  onPriorityChange: (priority: string) => void;
}) {
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ticketKey?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "" || item.status === statusFilter;
      const matchesPriority = priorityFilter === "" || item.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [items, searchQuery, statusFilter, priorityFilter]);

  useEffect(() => {
    onFilter(filtered);
  }, [filtered, onFilter]);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="relative min-w-[240px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by title, customer, or ticket key..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]/30 dark:border-slate-700 dark:bg-slate-800 dark:placeholder:text-slate-500"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      >
        <option value="">All Status</option>
        <option value="OPEN">Open</option>
        <option value="ACKNOWLEDGED">Acknowledged</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="RESOLVED">Resolved</option>
      </select>

      <select
        value={priorityFilter}
        onChange={(e) => onPriorityChange(e.target.value)}
        className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      >
        <option value="">All Priority</option>
        <option value="CRITICAL">Critical</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </select>

      <p className="whitespace-nowrap px-1 text-[10px] text-slate-500 dark:text-slate-400">
        {filtered.length} of {items.length} tickets
      </p>
    </div>
  );
}

function SlaChip({ slaDueAt, slaBreached, nowMs }: { slaDueAt: string | null; slaBreached: boolean; nowMs: number }) {
  if (!slaDueAt) return <span className="text-xs text-slate-300">-</span>;

  const diff = new Date(slaDueAt).getTime() - nowMs;

  // Overdue status
  if (slaBreached || diff < 0) {
    const over = Math.abs(diff);
    const h = Math.floor(over / 3600000);
    const m = Math.floor((over % 3600000) / 60000);
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
          Overdue {h > 0 ? `${h}h ` : ""}{m}m
        </span>
        <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full w-full bg-red-500" />
        </div>
      </div>
    );
  }

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);

  // Determine color based on hours remaining
  let color = "text-slate-400";
  let bgColor = "bg-slate-200";
  if (h < 1) {
    color = "text-red-600 dark:text-red-400";
    bgColor = "bg-red-400";
  } else if (h < 6) {
    color = "text-amber-600 dark:text-amber-400";
    bgColor = "bg-amber-400";
  } else {
    color = "text-emerald-600 dark:text-emerald-400";
    bgColor = "bg-emerald-400";
  }

  // Calculate progress percentage (assuming max 24 hours for the progress bar)
  const totalHours = 24;
  const remainingHours = Math.max(0, h + m / 60);
  const progressPercent = Math.min(100, (remainingHours / totalHours) * 100);

  return (
    <div className="flex flex-col items-end gap-1">
      <span className={`text-[11px] font-semibold ${color}`}>
        {h > 24 ? `${Math.floor(h / 24)}d` : h > 0 ? `${h}h ${m}m` : `${m}m`} left
      </span>
      <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full ${bgColor} transition-all`} style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accentColor,
  iconColor,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  accentColor: string;
  iconColor: string;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`group rounded-xl border border-slate-200 bg-white px-4 py-3 border-l-[3px] dark:border-slate-800 dark:bg-slate-900 ${accentColor} ${onClick ? "cursor-pointer transition-all duration-150 hover:border-slate-300 hover:shadow-sm dark:hover:border-slate-700" : ""}`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase leading-none tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        <div className={`rounded-md p-1 ${iconColor}`}>
          <Icon className="h-3 w-3" />
        </div>
      </div>
      <p className="text-[22px] font-bold leading-none tabular-nums text-slate-900 dark:text-slate-50">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{sub}</p>
    </div>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  meta,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
      <div className="flex min-w-0 items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />}
        <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</span>
      </div>
      {action ?? (meta ? <span className="flex-shrink-0 text-[10px] text-slate-400">{meta}</span> : null)}
    </div>
  );
}

function IssueRow({
  issue,
  nowMs,
  onClick,
  onStatusChange,
}: {
  issue: IssueItem;
  nowMs: number;
  onClick: () => void;
  onStatusChange?: (ticketId: string, newStatus: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const activityInfo = getActivityTimeInfo(issue.updatedAt, nowMs);

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(issue.id, newStatus);
      setShowActions(false);
    }
  };

  return (
    <div
      className={`group relative flex w-full items-center gap-2.5 rounded-md border border-slate-100 px-3 py-2 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 border-l-[3px] ${PRIORITY_BORDER[issue.priority] ?? "border-l-slate-200"}`}
    >
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${PRIORITY_DOT[issue.priority] ?? "bg-slate-300"}`} />
      <button
        onClick={onClick}
        className="min-w-0 flex-1 text-left"
      >
        <div className="mb-0.5 flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-semibold text-[#0052CC] dark:text-blue-400">
            {issue.ticketKey ?? issue.id.slice(0, 8)}
          </span>
          <span className="truncate text-[11px] text-slate-400">{issue.client.name}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none ${STATUS_MAP[issue.status] ?? STATUS_MAP.CLOSED}`}>
            {issue.status.replace("_", " ")}
          </span>
        </div>
        <p className="truncate text-xs font-medium text-slate-800 transition-colors group-hover:text-[#0052CC] dark:text-slate-200 dark:group-hover:text-blue-400">
          {issue.title}
        </p>
      </button>

      {/* Activity Clock */}
      <div className={`flex-shrink-0 whitespace-nowrap text-right text-[11px] font-medium ${activityInfo.color}`}>
        {activityInfo.text}
      </div>

      <div className="flex-shrink-0 text-right">
        <SlaChip slaDueAt={issue.slaDueAt} slaBreached={issue.slaBreached} nowMs={nowMs} />
      </div>

      {/* Quick Actions Dropdown */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowActions(!showActions)}
          className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          title="More actions"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {showActions && (
          <div className="absolute right-0 top-full z-40 mt-1 min-w-[160px] rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={() => {
                handleStatusChange("IN_PROGRESS");
              }}
              className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Mark In Progress
            </button>
            <button
              onClick={() => {
                handleStatusChange("ACKNOWLEDGED");
              }}
              className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Mark Acknowledged
            </button>
            <button
              onClick={() => onClick()}
              className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700 border-t border-slate-100 dark:border-slate-700"
            >
              View Details
            </button>
          </div>
        )}
      </div>

      <ChevronRight className="h-3 w-3 flex-shrink-0 text-slate-300" />
    </div>
  );
}

export default function AgentDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<"queue" | "needs" | "recent">("queue");
  const [nowMs, setNowMs] = useState(0);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [filteredItems, setFilteredItems] = useState<IssueItem[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent/stats");
      if (res.ok) setData(await res.json());
    } catch {
    } finally {
      setNowMs(Date.now());
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/dashboard/tickets/${ticketId}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Optimistically update local state
        if (data) {
          const updatedData = {
            ...data,
            priorityQueue: data.priorityQueue.map((item) =>
              item.id === ticketId ? { ...item, status: newStatus } : item
            ),
            recentIssues: data.recentIssues.map((item) =>
              item.id === ticketId ? { ...item, status: newStatus } : item
            ),
          };
          setData(updatedData);
        }
      }
    } catch (error) {
      console.error("Failed to update ticket status:", error);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const firstName = session?.user?.name?.split(" ")[0] ?? null;

  const kpiCards = data
    ? [
        {
          label: "Assigned to Me",
          value: data.kpis.assigned,
          sub: "open tickets",
          icon: AlertCircle,
          accent: "border-l-slate-500",
          iconCls: "bg-slate-100 text-slate-500 dark:bg-slate-800",
          route: "/tickets",
        },
        {
          label: "SLA Overdue",
          value: data.kpis.overdue,
          sub: "needs response",
          icon: ShieldAlert,
          accent: "border-l-red-500",
          iconCls: "bg-red-50 text-red-500 dark:bg-red-950/40",
          route: "/tickets?sla=overdue",
        },
        {
          label: "Needs Response",
          value: data.kpis.pendingResponse,
          sub: "awaiting action",
          icon: MessageSquare,
          accent: "border-l-amber-400",
          iconCls: "bg-amber-50 text-amber-500 dark:bg-amber-950/40",
          route: null,
        },
        {
          label: "Resolved Today",
          value: data.kpis.resolvedToday,
          sub: data.kpis.avgResponseHrs > 0 ? `${data.kpis.avgResponseHrs}h avg` : "closed today",
          icon: CheckCircle,
          accent: "border-l-emerald-400",
          iconCls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40",
          route: null,
        },
      ]
    : [];

  // Update filteredItems when data or view changes
  useEffect(() => {
    const queueItems =
      activeView === "queue"
        ? (data?.priorityQueue ?? [])
        : activeView === "needs"
          ? (data?.priorityQueue ?? []).filter((issue) => issue.status === "ACKNOWLEDGED")
          : (data?.recentIssues ?? []);
    setFilteredItems(queueItems);
  }, [data, activeView]);

  const queueItems =
    activeView === "queue"
      ? (data?.priorityQueue ?? [])
      : activeView === "needs"
        ? (data?.priorityQueue ?? []).filter((issue) => issue.status === "ACKNOWLEDGED")
        : (data?.recentIssues ?? []);

  const segBtn = (active: boolean) =>
    `px-3 py-1 text-xs rounded-md font-medium transition-colors ${
      active
        ? "bg-[#0052CC] text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
    }`;

  const insightTone = (type: AiInsight["type"]) =>
    type === "ai_draft"
      ? "border-blue-100 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-950/20"
      : type === "sla_breach"
        ? "border-red-100 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/20"
        : "border-amber-100 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20";

  const insightIconColor = (type: AiInsight["type"]) =>
    type === "ai_draft"
      ? "text-blue-500"
      : type === "sla_breach"
        ? "text-red-500"
        : "text-amber-500";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8F9FB] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          left={
            <div>
              <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {firstName ? `Hi, ${firstName}` : "Agent Dashboard"}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Assigned work queue</p>
            </div>
          }
          right={undefined}
        />

        <main className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-slate-200 border-l-[3px] border-l-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                      <div className="h-5 w-5 rounded-md bg-slate-100 dark:bg-slate-800" />
                    </div>
                    <div className="mb-2 h-6 w-12 rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="h-2 w-20 rounded bg-slate-100 dark:bg-slate-800" />
                  </div>
                ))
              : kpiCards.map(({ label, value, sub, icon, accent, iconCls, route }) => (
                  <KpiCard
                    key={label}
                    label={label}
                    value={value}
                    sub={sub}
                    icon={icon}
                    accentColor={accent}
                    iconColor={iconCls}
                    onClick={route ? () => router.push(route) : undefined}
                  />
                ))}
          </div>

          {!loading && (data?.kpis.overdue ?? 0) > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/60 dark:bg-red-950/20">
              <div className="rounded-md bg-white/70 p-1 dark:bg-black/20">
                <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
              </div>
              <p className="flex-1 text-xs font-medium text-red-800 dark:text-red-300">
                <span className="font-semibold">{data?.kpis.overdue} issue{(data?.kpis.overdue ?? 0) > 1 ? "s" : ""}</span> overdue - respond immediately to avoid further SLA breaches.
              </p>
              <button
                onClick={() => router.push("/tickets?sla=overdue")}
                className="flex flex-shrink-0 items-center gap-0.5 text-xs font-semibold text-red-600 hover:underline dark:text-red-400"
              >
                View <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="flex flex-col gap-4 xl:col-span-2">
              {!loading && (data?.aiInsights ?? []).length > 0 && (
                <div className="order-2 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <PanelHeader icon={Bot} title="AI Assist" meta="Data-backed suggestions" />
                  <div className="space-y-2 p-3">
                    {data!.aiInsights.map((insight) => (
                      <div key={insight.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${insightTone(insight.type)}`}>
                        <div className="rounded-md bg-white/80 p-1 dark:bg-black/20">
                          <Zap className={`h-3.5 w-3.5 ${insightIconColor(insight.type)}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            <span className="font-mono text-[11px] font-semibold text-[#0052CC] dark:text-blue-400">
                              {insight.ticketKey ?? insight.id.slice(0, 8)}
                            </span>{" "}
                            {insight.message}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            {`${insight.source} - ${insight.waitHours}h since update - ${insight.client.name} - ${insight.title}`}
                          </p>
                        </div>
                        <button
                          onClick={() => router.push(`/tickets/${insight.ticketKey ?? insight.id}`)}
                          className="flex flex-shrink-0 items-center gap-0.5 text-xs font-medium text-[#0052CC] hover:text-[#0747A6] dark:text-blue-400"
                        >
                          View <ArrowUpRight className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="order-1 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <PanelHeader
                  icon={activeView === "recent" ? Clock : activeView === "needs" ? MessageSquare : ShieldAlert}
                  title={activeView === "queue" ? "Priority Queue" : activeView === "needs" ? "Needs Response" : "Recent Activity"}
                  action={
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                        {(["queue", "needs", "recent"] as const).map((view) => (
                          <button key={view} onClick={() => setActiveView(view)} className={segBtn(activeView === view)}>
                            {view === "queue" ? "Priority" : view === "needs" ? "Needs Reply" : "Recent"}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          setRefreshing(true);
                          load();
                        }}
                        className="flex h-7 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh
                      </button>
                      <button
                        onClick={() => router.push("/tickets")}
                        className="flex items-center gap-0.5 text-xs font-medium text-[#0052CC] hover:text-[#0747A6] dark:text-blue-400"
                      >
                        View all <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </div>
                  }
                />

                <div className="p-3">
                  {!loading && queueItems.length > 0 && (
                    <div className="mb-3">
                      <SearchFilterBar
                        items={queueItems}
                        onFilter={setFilteredItems}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        statusFilter={statusFilter}
                        onStatusChange={setStatusFilter}
                        priorityFilter={priorityFilter}
                        onPriorityChange={setPriorityFilter}
                      />
                    </div>
                  )}

                  {loading ? (
                  <div className="space-y-1.5 p-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-11 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
                      ))}
                    </div>
                  ) : filteredItems.length === 0 && queueItems.length === 0 ? (
                    <div className="py-10 text-center">
                      <CheckCircle className="mx-auto mb-2.5 h-9 w-9 text-emerald-300 dark:text-emerald-700" />
                      <p className="text-sm text-slate-400">No active issues - great work!</p>
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="py-8 text-center">
                      <AlertCircle className="mx-auto mb-2.5 h-8 w-8 text-slate-300 dark:text-slate-700" />
                      <p className="text-sm text-slate-400">No tickets match your filters</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredItems.map((issue) => (
                        <IssueRow
                          key={issue.id}
                          issue={issue}
                          nowMs={nowMs}
                          onClick={() => router.push(`/tickets/${issue.ticketKey ?? issue.id}`)}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <PanelHeader icon={Timer} title="Upcoming Breaches" meta="next 4h" />
                <div className="p-3">
                  {loading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                      ))}
                    </div>
                  ) : (data?.upcomingBreaches ?? []).length === 0 ? (
                    <div className="py-6 text-center">
                      <CheckCircle className="mx-auto mb-2 h-7 w-7 text-emerald-300 dark:text-emerald-700" />
                      <p className="text-xs text-slate-400">Clear for next 4 hours</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {data!.upcomingBreaches.map((issue) => {
                        const diffMs = new Date(issue.slaDueAt!).getTime() - nowMs;
                        const h = Math.floor(diffMs / 3600000);
                        const m = Math.floor((diffMs % 3600000) / 60000);
                        return (
                          <button
                            key={issue.id}
                            onClick={() => router.push(`/tickets/${issue.ticketKey ?? issue.id}`)}
                            className="w-full rounded-lg border border-amber-100 bg-amber-50/50 p-2.5 text-left transition-colors hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 dark:hover:bg-amber-950/40"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-mono text-[11px] font-semibold text-[#0052CC] dark:text-blue-400">
                                  {issue.ticketKey ?? issue.id.slice(0, 8)}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300">{issue.title}</p>
                              </div>
                              <span className="flex-shrink-0 text-xs font-semibold text-amber-600 dark:text-amber-400">{h}h {m}m</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Today&apos;s Summary</h3>
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {[
                      { label: "Pending Response", value: data?.kpis.pendingResponse ?? 0, cls: "text-amber-600 dark:text-amber-400" },
                      { label: "SLA Breaches", value: data?.kpis.slaBreaches ?? 0, cls: data?.kpis.slaBreaches ? "text-red-600 dark:text-red-400" : "text-slate-400" },
                      { label: "Resolved Today", value: data?.kpis.resolvedToday ?? 0, cls: "text-emerald-600 dark:text-emerald-400" },
                    ].map(({ label, value, cls }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                        <span className={`text-sm font-semibold tabular-nums ${cls}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Quick Links</h3>
                <div className="space-y-0.5">
                  {[
                    { label: "My Issue Queue", href: "/tickets" },
                    { label: "Knowledge Base", href: "/agent/kb" },
                    { label: "All Issues", href: "/tickets?view=all" },
                  ].map(({ label, href }) => (
                    <button
                      key={href}
                      onClick={() => router.push(href)}
                      className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#0052CC] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                    >
                      {label}
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
