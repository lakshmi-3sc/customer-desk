'use client';

import { useEffect, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronRight, Plus, Search, X, Download, ShieldAlert, Clock } from 'lucide-react';
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
  const [projects, setProjects] = useState<any[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [filterAgent, setFilterAgent] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [filterSlaAtRisk, setFilterSlaAtRisk] = useState(false);
  const [filterSlaBreached, setFilterSlaBreached] = useState(false);
  const [filterUnresponded, setFilterUnresponded] = useState(false);

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

  const filteredTickets = tickets.filter((t) => {
    const hasAlertFilter = !!(filterPriority || filterUnassigned || filterSlaAtRisk || filterSlaBreached || filterUnresponded);
    if (hasAlertFilter && ['RESOLVED', 'CLOSED'].includes(t.status)) return false;
    if (searchQuery && !(
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.ticketKey ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    )) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    if (filterClient && t.client?.id !== filterClient) return false;
    if (filterProject && t.project?.id !== filterProject) return false;
    if (filterDateFrom && new Date(t.createdAt) < new Date(filterDateFrom)) return false;
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(t.createdAt) > toDate) return false;
    }
    if (filterAgent && t.assignedTo?.id !== filterAgent) return false;
    if (filterUnassigned && t.assignedTo?.id) return false;
    if (filterSlaAtRisk && !t.slaBreachRisk) return false;
    if (filterSlaBreached && !t.slaBreached) return false;
    if (filterUnresponded && t.hasResponse) return false;
    return true;
  });

  const hasActiveFilters = !!(filterPriority || filterCategory || filterClient || filterProject || filterDateFrom || filterDateTo || filterAgent || filterUnassigned || filterSlaAtRisk || filterSlaBreached || filterUnresponded);

  const clearFilters = () => {
    setFilterPriority(''); setFilterCategory(''); setFilterClient('');
    setFilterProject(''); setFilterDateFrom(''); setFilterDateTo('');
    setFilterAgent(''); setFilterUnassigned(false); setFilterSlaAtRisk(false);
    setFilterSlaBreached(false); setFilterUnresponded(false);
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
      fetch('/api/admin/customers')
        .then((r) => r.ok ? r.json() : { clients: [] })
        .then((d) => setClients((d.clients ?? []).map((c: any) => ({ id: c.id, name: c.name }))))
        .catch(() => {});
    }
    if (!isLead) return;
    fetch('/api/dashboard/users')
      .then((r) => r.ok ? r.json() : [])
      .then((users: any[]) => setAgents(users.filter((u) => u.role === 'THREESC_AGENT')))
      .catch(() => {});
  }, [is3SCTeam, isLead]);

  useEffect(() => { setActiveTab(statusParam === 'ALL' ? 'ALL' : statusParam); }, [statusParam]);

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeTab !== 'ALL') params.append('status', activeTab);
        const res = await fetch(`/api/dashboard/tickets?${params.toString()}`, { cache: 'no-store' });
        const data = await res.json();
        setTickets((data.tickets || []).sort(
          (a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchTickets();
  }, [activeTab]);

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
    router.push(tab === 'ALL' ? '/tickets' : `/tickets?status=${tab}`);
  };

  const formatDateShort = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F8F9FB] dark:bg-slate-950">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
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
          {/* Tabs + filter bar merged into one compact header */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 pt-2 pb-0">
            {/* Tab row */}
            <div className="flex items-center justify-between -mb-px">
              <div className="flex gap-0">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'border-[#0052CC] text-[#0052CC] dark:text-blue-400 dark:border-blue-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={exportCSV}
                title="Export CSV"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors mb-1"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto px-5 py-3">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
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
                <option value="FEATURE">Feature</option>
                <option value="QUESTION">Question</option>
                <option value="OTHER">Other</option>
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

              {hasActiveFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />Clear
                </button>
              )}
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
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/30">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {loading ? 'Loading…' : searchQuery
                    ? `${filteredTickets.length} result${filteredTickets.length !== 1 ? 's' : ''} for "${searchQuery}"`
                    : `${filteredTickets.length} issue${filteredTickets.length !== 1 ? 's' : ''}${hasActiveFilters ? ' (filtered)' : ''}`}
                </p>
                {searchQuery && (
                  <button onClick={() => router.push('/tickets')} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    <X className="w-3 h-3" />Clear search
                  </button>
                )}
              </div>

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
                      <Button variant="outline" size="sm" onClick={() => router.push('/tickets')}>
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
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-28">Key</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Summary</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-24">Priority</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-28">Status</th>
                        {is3SCTeam && <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-32">Customer</th>}
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-28">Agent</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-20">Created</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-20">SLA Due</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-20">SLA</th>
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
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 font-mono text-[10px] font-semibold text-[#0052CC] dark:text-blue-400 tracking-wide">
                                {key}
                              </span>
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-[#0052CC] dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                                {ticket.title}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <PriorityBadge priority={ticket.priority} />
                            </td>
                            <td className="px-4 py-3">
                              <StatusLozenge status={ticket.status} />
                            </td>
                            {is3SCTeam && (
                              <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[128px]">{ticket.client?.name ?? '—'}</td>
                            )}
                            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {ticket.assignedTo?.name ?? <span className="text-slate-300 dark:text-slate-600 italic">Unassigned</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                              {formatDateShort(ticket.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                              {ticket.slaDueAt ? (
                                <span className={`flex items-center gap-1 ${ticket.slaBreached ? 'text-red-600 font-semibold' : ticket.slaBreachRisk ? 'text-amber-500 font-medium' : 'text-slate-400'}`}>
                                  {ticket.slaBreached && <ShieldAlert className="w-3 h-3" />}
                                  {ticket.slaBreachRisk && !ticket.slaBreached && <Clock className="w-3 h-3" />}
                                  {formatDateShort(ticket.slaDueAt)}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                              {ticket.slaBreached ? (
                                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold"><ShieldAlert className="w-3 h-3" />Breached</span>
                              ) : ticket.slaBreachRisk ? (
                                <span className="text-amber-500 dark:text-amber-400 font-medium">At Risk</span>
                              ) : (
                                <span className="text-emerald-500 dark:text-emerald-400">OK</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
