'use client';

import { useEffect, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronRight, Plus, Search, X, Download, ShieldAlert, Clock, SlidersHorizontal } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppSidebar } from '@/components/app-sidebar';
import { TopBar } from '@/components/top-bar';
import { getSocket } from '@/lib/socket-client';

interface Ticket {
  id: string;
  ticketKey: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string;
  slaBreached?: boolean;
  slaBreachRisk?: boolean;
  slaDueAt?: string | null;
  hasResponse?: boolean;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string } | null;
  raisedBy?: { name: string } | null;
  assignedTo?: { id: string; name: string } | null;
  client?: { id: string; name: string } | null;
}

interface ProjectOption {
  id: string;
  name: string;
  displayName?: string | null;
  clientId?: string | null;
}

interface AdminClientOption {
  id: string;
  name: string;
}

interface DashboardUserOption {
  id: string;
  name: string;
  role: string;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const generateTicketKey = (project: { name: string } | null, ticketId: string): string => {
  if (!project) return `TKT-${ticketId.slice(0, 8).toUpperCase()}`;
  const projectKey = project.name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);
  const hash = ticketId.split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0);
  return `${projectKey}-${Math.abs(hash % 9999) + 1000}`;
};

const STATUS_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'CLOSED', label: 'Closed' },
];

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  OPEN:         { label: 'Open',         cls: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800' },
  IN_PROGRESS:  { label: 'In Progress',  cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800' },
  RESOLVED:     { label: 'Resolved',     cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800' },
  ACKNOWLEDGED: { label: 'Acknowledged', cls: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 ring-1 ring-purple-200 dark:ring-purple-800' },
  CLOSED:       { label: 'Closed',       cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700' },
};

function StatusLozenge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.CLOSED;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

const PRIORITY_MAP: Record<string, { cls: string; dot: string; label: string }> = {
  CRITICAL: { cls: 'text-red-600 dark:text-red-400',       dot: 'bg-red-500',    label: 'Critical' },
  HIGH:     { cls: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500', label: 'High' },
  MEDIUM:   { cls: 'text-yellow-600 dark:text-yellow-500', dot: 'bg-yellow-400', label: 'Medium' },
  LOW:      { cls: 'text-blue-500 dark:text-blue-400',     dot: 'bg-blue-400',   label: 'Low' },
};

function PriorityBadge({ priority }: { priority: string }) {
  const p = PRIORITY_MAP[priority?.toUpperCase()] ?? { cls: 'text-slate-500', dot: 'bg-slate-400', label: priority };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${p.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.dot}`} />
      {p.label}
    </span>
  );
}

const selectCls = 'text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/40 focus:border-[#0052CC] transition-colors min-w-max';
const metaCellCls = 'px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap';

function TicketsContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [filterAgent, setFilterAgent] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [filterSlaAtRisk, setFilterSlaAtRisk] = useState(false);
  const [filterSlaBreached, setFilterSlaBreached] = useState(false);
  const [filterUnresponded, setFilterUnresponded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
  });

  const isClientUser = session?.user?.role === 'CLIENT_USER';
  const isLead = session?.user?.role === 'THREESC_LEAD';
  const is3SCTeam = ['THREESC_ADMIN', 'THREESC_LEAD', 'THREESC_AGENT'].includes(session?.user?.role ?? '');

  const statusParam = searchParams.get('status') || 'ALL';
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    const priority = searchParams.get('priority');
    const unassigned = searchParams.get('unassigned');
    const slaAtRisk = searchParams.get('slaAtRisk');
    const slaBreached = searchParams.get('slaBreached');
    if (priority) setFilterPriority(priority);
    if (unassigned === 'true') setFilterUnassigned(true);
    if (slaAtRisk === 'true') setFilterSlaAtRisk(true);
    if (slaBreached === 'true') setFilterSlaBreached(true);
    if (searchParams.get('unresponded') === 'true') setFilterUnresponded(true);
  }, [searchParams]);

  const filteredTickets = tickets;

  const activeFilterCount = [
    filterPriority,
    filterCategory,
    filterClient,
    filterProject,
    filterDateFrom || filterDateTo,
    filterAgent,
    filterUnassigned,
    filterSlaAtRisk,
    filterSlaBreached,
    filterUnresponded,
  ].filter(Boolean).length;
  const totalIssues = pagination.total;
  const pageStart = totalIssues === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const pageEnd = Math.min(totalIssues, pagination.page * pagination.pageSize);
  const visiblePages = Array.from(
    new Set([1, pagination.page - 1, pagination.page, pagination.page + 1, pagination.totalPages]
      .filter((n) => n >= 1 && n <= pagination.totalPages))
  ).sort((a, b) => a - b);

  const clearFilters = () => {
    setFilterPriority(''); setFilterCategory(''); setFilterClient('');
    setFilterProject(''); setFilterDateFrom(''); setFilterDateTo('');
    setFilterAgent(''); setFilterUnassigned(false); setFilterSlaAtRisk(false);
    setFilterSlaBreached(false); setFilterUnresponded(false);
    setPage(1);
  };

  const exportCSV = () => {
    const rows = [
      ['Key', 'Title', 'Status', 'Priority', 'Project', 'Created'],
      ...filteredTickets.map((t) => [
        t.ticketKey ?? generateTicketKey(t.project, t.id),
        `"${t.title.replace(/"/g, '""')}"`,
        t.status, t.priority, t.project?.name ?? '',
        new Date(t.createdAt).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `issues-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetch('/api/dashboard/projects', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : { projects: [] })
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {});
  }, [is3SCTeam]);

  useEffect(() => {
    if (is3SCTeam) {
      fetch('/api/dashboard/clients', { cache: 'no-store' })
        .then((r) => r.ok ? r.json() : { clients: [] })
        .then((d: { clients?: AdminClientOption[] }) => setClients((d.clients ?? []).map((c) => ({ id: c.id, name: c.name }))))
        .catch(() => {});
    }
    if (!isLead) return;
    fetch('/api/dashboard/users')
      .then((r) => r.ok ? r.json() : [])
      .then((users: DashboardUserOption[]) => setAgents(users.filter((u) => u.role === 'THREESC_AGENT')))
      .catch(() => {});
  }, [is3SCTeam, isLead]);

  useEffect(() => { setActiveTab(statusParam === 'ALL' ? 'ALL' : statusParam); }, [statusParam]);

  useEffect(() => {
    setPage(1);
  }, [
    activeTab,
    searchQuery,
    filterPriority,
    filterCategory,
    filterClient,
    filterProject,
    filterDateFrom,
    filterDateTo,
    filterAgent,
    filterUnassigned,
    filterSlaAtRisk,
    filterSlaBreached,
    filterUnresponded,
    pageSize,
  ]);

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        if (activeTab !== 'ALL') params.append('status', activeTab);
        if (searchQuery) params.set('search', searchQuery);
        if (filterPriority) params.set('priority', filterPriority);
        if (filterCategory) params.set('category', filterCategory);
        if (filterClient) params.set('clientId', filterClient);
        if (filterProject) params.set('projectId', filterProject);
        if (filterDateFrom) params.set('dateFrom', filterDateFrom);
        if (filterDateTo) params.set('dateTo', filterDateTo);
        if (filterAgent) params.set('assignedToId', filterAgent);
        if (filterUnassigned) params.set('unassigned', 'true');
        if (filterSlaAtRisk) params.set('slaAtRisk', 'true');
        if (filterSlaBreached) params.set('slaBreached', 'true');
        if (filterUnresponded) params.set('unresponded', 'true');
        const res = await fetch(`/api/dashboard/tickets?${params.toString()}`, { cache: 'no-store' });
        const data = await res.json();
        setTickets((data.tickets || []) as Ticket[]);
        setPagination(data.pagination ?? {
          page,
          pageSize,
          total: (data.tickets || []).length,
          totalPages: 1,
        });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchTickets();
  }, [
    activeTab,
    searchQuery,
    filterPriority,
    filterCategory,
    filterClient,
    filterProject,
    filterDateFrom,
    filterDateTo,
    filterAgent,
    filterUnassigned,
    filterSlaAtRisk,
    filterSlaBreached,
    filterUnresponded,
    page,
    pageSize,
  ]);

  useEffect(() => {
    const socket = getSocket();
    const joinRoom = () => socket.emit('join:tickets');
    if (socket.connected) joinRoom();
    socket.on('connect', joinRoom);
    socket.on('ticket:updated', (updated: Ticket) => {
      setTickets((prev) =>
        prev.some((t) => t.id === updated.id)
          ? prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          : prev
      );
    });
    return () => { socket.off('connect', joinRoom); socket.off('ticket:updated'); };
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(1);
  };

  const formatDateShort = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F8F9FB] dark:bg-slate-950 font-sans">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden font-sans">
        <TopBar
          left={
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-[#0052CC] dark:text-blue-400 hover:underline font-medium"
              >
                Overview
              </button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {isClientUser ? 'My Issues' : 'Issues'}
              </span>
            </div>
          }
          right={
            isClientUser ? (
              <button
                onClick={() => router.push('/create-ticket')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0052CC] hover:bg-[#0747A6] text-white rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                New Issue
              </button>
            ) : undefined
          }
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto px-5 py-3">
            {/* Compact control bar */}
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="order-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleTabChange(tab.key)}
                    className={`h-7 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors ${
                      activeTab === tab.key
                        ? 'bg-[#0052CC] text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                className={`order-4 flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                  showFilters || activeFilterCount > 0
                    ? 'border-[#0052CC]/30 bg-blue-50 text-[#0052CC] dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-[#0052CC] px-1.5 py-0.5 text-[10px] leading-none text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="order-2 flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-400 transition-colors hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}

              {showFilters && (
                <div className="order-last grid w-full gap-2 border-t border-slate-100 pt-2 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={selectCls}>
                <option value="">Priority</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={selectCls}>
                <option value="">Category</option>
                <option value="BUG">Bug</option>
                <option value="FEATURE_REQUEST">Feature Request</option>
                <option value="DATA_ACCURACY">Data Accuracy</option>
                <option value="PERFORMANCE">Performance</option>
                <option value="ACCESS_SECURITY">Access / Security</option>
              </select>

              {is3SCTeam && (
                <select
                  value={filterClient}
                  onChange={(e) => { setFilterClient(e.target.value); setFilterProject(''); }}
                  className={selectCls}
                  style={{ maxWidth: '150px' }}
                >
                  <option value="">Client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name.length > 18 ? c.name.slice(0, 15) + '…' : c.name}</option>
                  ))}
                </select>
              )}

              <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className={selectCls} style={{ maxWidth: '200px' }}>
                <option value="">Project</option>
                {projects
                  .filter((p) => !filterClient || p.clientId === filterClient)
                  .map((p) => {
                    const displayText = p.displayName || p.name;
                    return (
                      <option key={p.id} value={p.id}>{displayText.length > 25 ? displayText.slice(0, 22) + '…' : displayText}</option>
                    );
                  })}
              </select>

              {isLead && (
                <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className={selectCls}>
                  <option value="">Agent</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name.length > 15 ? a.name.slice(0, 12) + '…' : a.name}</option>)}
                </select>
              )}

              <div className="flex items-center gap-1">
                <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className={selectCls} />
                <span className="text-xs text-slate-400">–</span>
                <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className={selectCls} />
              </div>
                </div>
              )}

              <button
                onClick={exportCSV}
                title="Export CSV"
                className="order-3 ml-auto flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>

            {/* Active alert filter chips */}
            {(filterPriority || filterUnassigned || filterSlaAtRisk || filterSlaBreached || filterUnresponded) && (
              <div className="flex items-center gap-2 flex-wrap mb-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Active filter:</span>
                {filterPriority && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">Priority: {filterPriority}</span>}
                {filterUnassigned && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">Unassigned</span>}
                {filterSlaAtRisk && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">SLA At-Risk</span>}
                {filterSlaBreached && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium">SLA Breached</span>}
                {filterUnresponded && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">Unresponded &gt;24h</span>}
                <button onClick={clearFilters} className="ml-auto text-xs text-slate-400 hover:text-red-500 transition-colors">Clear ×</button>
              </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-6 space-y-2.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="py-20 text-center">
                  {searchQuery ? (
                    <>
                      <Search className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">No results for &ldquo;{searchQuery}&rdquo;</p>
                      <p className="text-xs text-slate-400 mb-5">Try a different keyword or ticket key.</p>
                      <Button variant="outline" size="sm" onClick={() => router.push(activeTab === 'ALL' ? '/tickets' : `/tickets?status=${activeTab}`)}>
                        <X className="w-3.5 h-3.5 mr-1.5" />Clear search
                      </Button>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-300 dark:text-emerald-700" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">No issues found</p>
                      <p className="text-xs text-slate-400 mb-5">
                        {activeTab === 'OPEN' ? 'All caught up — no open issues!' : 'No issues match this filter.'}
                      </p>
                      {isClientUser && (
                        <Button size="sm" onClick={() => router.push('/create-ticket')} className="bg-[#0052CC] hover:bg-[#0747A6] text-white">
                          <Plus className="w-3.5 h-3.5 mr-1.5" />Create Issue
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400/90 dark:text-slate-500 uppercase tracking-wide w-28">Key</th>
                        <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400/90 dark:text-slate-500 uppercase tracking-wide">Summary</th>
                        <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400/90 dark:text-slate-500 uppercase tracking-wide w-24">Priority</th>
                        <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400/90 dark:text-slate-500 uppercase tracking-wide w-28">Status</th>
                        {is3SCTeam && <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400/90 dark:text-slate-500 uppercase tracking-wide w-32">Customer</th>}
                        <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400/90 dark:text-slate-500 uppercase tracking-wide w-28">Agent</th>
                        <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400/90 dark:text-slate-500 uppercase tracking-wide w-20">Created</th>
                        <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400/90 dark:text-slate-500 uppercase tracking-wide w-20">SLA Due</th>
                        <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400/90 dark:text-slate-500 uppercase tracking-wide w-20">SLA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                      {filteredTickets.map((ticket) => {
                        const key = ticket.ticketKey ?? generateTicketKey(ticket.project, ticket.id);
                        return (
                          <tr
                            key={ticket.id}
                            onClick={() => router.push(`/tickets/${key}`)}
                            className={`cursor-pointer transition-colors group hover:bg-slate-50 dark:hover:bg-slate-800/40 ${ticket.slaBreached ? 'border-l-[3px] border-l-red-500' : ticket.slaBreachRisk ? 'border-l-[3px] border-l-amber-400' : ''}`}
                          >
                            <td className="px-4 py-2.5">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 font-mono text-[10px] font-semibold text-[#0052CC] dark:text-blue-400 tracking-wide">
                                {key}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 max-w-xs">
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-[#0052CC] dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                                {ticket.title}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <PriorityBadge priority={ticket.priority} />
                            </td>
                            <td className="px-4 py-2.5">
                              <StatusLozenge status={ticket.status} />
                            </td>
                            {is3SCTeam && (
                              <td className={`${metaCellCls} max-w-[128px] truncate`}>{ticket.client?.name ?? '—'}</td>
                            )}
                            <td className={metaCellCls}>
                              {ticket.assignedTo?.name ?? <span className="font-normal italic text-slate-400 dark:text-slate-500">Unassigned</span>}
                            </td>
                            <td className={metaCellCls}>
                              {formatDateShort(ticket.createdAt)}
                            </td>
                            <td className={metaCellCls}>
                              {ticket.slaDueAt ? (
                                <span className={`flex items-center gap-1 ${ticket.slaBreached ? 'text-red-600 dark:text-red-400' : ticket.slaBreachRisk ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                                  {ticket.slaBreached && <ShieldAlert className="w-3 h-3" />}
                                  {ticket.slaBreachRisk && !ticket.slaBreached && <Clock className="w-3 h-3" />}
                                  {formatDateShort(ticket.slaDueAt)}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">—</span>
                              )}
                            </td>
                            <td className={metaCellCls}>
                              {ticket.slaBreached ? (
                                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400"><ShieldAlert className="w-3 h-3" />Breached</span>
                              ) : ticket.slaBreachRisk ? (
                                <span className="text-amber-600 dark:text-amber-400">At Risk</span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading && totalIssues > 0 && (
                <div className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Showing {pageStart}-{pageEnd} of {totalIssues}
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 focus:border-[#0052CC] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      aria-label="Rows per page"
                    >
                      <option value={10}>10 / page</option>
                      <option value={25}>25 / page</option>
                      <option value={50}>50 / page</option>
                      <option value={100}>100 / page</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={pagination.page <= 1}
                      className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Previous
                    </button>
                    <div className="hidden items-center gap-1 sm:flex">
                      {visiblePages.map((pageNumber, index) => {
                        const previousPage = visiblePages[index - 1];
                        return (
                          <div key={pageNumber} className="flex items-center gap-1">
                            {previousPage && pageNumber - previousPage > 1 && (
                              <span className="px-1 text-xs text-slate-400">...</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setPage(pageNumber)}
                              className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition-colors ${
                                pagination.page === pageNumber
                                  ? 'bg-[#0052CC] text-white shadow-sm'
                                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                      disabled={pagination.page >= pagination.totalPages}
                      className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-[#F8F9FB] dark:bg-slate-950">
        <div className="flex items-center gap-2 text-slate-400">
          <div className="w-4 h-4 border-2 border-[#0052CC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading issues…</span>
        </div>
      </div>
    }>
      <TicketsContent />
    </Suspense>
  );
}
