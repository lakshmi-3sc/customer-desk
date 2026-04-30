'use client';

import { useEffect, useState, Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Clock, ChevronRight, Plus, Search, X, Filter, Download, SlidersHorizontal, ShieldAlert, Users } from 'lucide-react';
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

function StatusLozenge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    RESOLVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    ACKNOWLEDGED: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    CLOSED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${map[status] ?? map.CLOSED}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { cls: string; dot: string }> = {
    CRITICAL: { cls: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
    HIGH: { cls: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
    MEDIUM: { cls: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-400' },
    LOW: { cls: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-400' },
  };
  const p = priority?.toUpperCase();
  const style = map[p] ?? { cls: 'text-slate-500', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${style.cls}`}>
      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
      {priority?.charAt(0) + priority?.slice(1).toLowerCase()}
    </span>
  );
}

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isClientUser = session?.user?.role === 'CLIENT_USER';
  const isLead = session?.user?.role === 'THREESC_LEAD';
  const is3SCTeam = ['THREESC_ADMIN', 'THREESC_LEAD', 'THREESC_AGENT'].includes(session?.user?.role ?? '');

  const [filterAgent, setFilterAgent] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [showBulkReassign, setShowBulkReassign] = useState(false);
  const [bulkAgent, setBulkAgent] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [filterSlaAtRisk, setFilterSlaAtRisk] = useState(false);
  const [filterSlaBreached, setFilterSlaBreached] = useState(false);

  const statusParam = searchParams.get('status') || 'ALL';
  const searchQuery = searchParams.get('search') || '';
  
  // Parse alert query parameters and apply filters
  useEffect(() => {
    const priority = searchParams.get('priority');
    const unassigned = searchParams.get('unassigned');
    const slaAtRisk = searchParams.get('slaAtRisk');
    const slaBreached = searchParams.get('slaBreached');
    
    if (priority) setFilterPriority(priority);
    if (unassigned === 'true') setFilterUnassigned(true);
    if (slaAtRisk === 'true') setFilterSlaAtRisk(true);
    if (slaBreached === 'true') setFilterSlaBreached(true);
  }, [searchParams]);

  const filteredTickets = tickets.filter((t) => {
    // When alert filters are active, only show active tickets (not resolved/closed)
    const hasAlertFilter = !!(filterPriority || filterUnassigned || filterSlaAtRisk || filterSlaBreached);
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
    return true;
  });

  const hasActiveFilters = !!(filterPriority || filterCategory || filterClient || filterProject || filterDateFrom || filterDateTo || filterAgent || filterUnassigned || filterSlaAtRisk || filterSlaBreached);

  const clearFilters = () => {
    setFilterPriority('');
    setFilterCategory('');
    setFilterClient('');
    setFilterProject('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterAgent('');
    setFilterUnassigned(false);
    setFilterSlaAtRisk(false);
    setFilterSlaBreached(false);
  };

  const handleBulkReassign = async () => {
    if (!bulkAgent || selectedIds.size === 0) return;
    setBulkSaving(true);
    try {
      await Promise.all([...selectedIds].map((id) =>
        fetch(`/api/dashboard/tickets/${id}/update`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedToId: bulkAgent }),
        })
      ));
      setSelectedIds(new Set());
      setShowBulkReassign(false);
      setBulkAgent('');
      // Refresh tickets
      const params = new URLSearchParams();
      if (activeTab !== 'ALL') params.append('status', activeTab);
      const res = await fetch(`/api/dashboard/tickets?${params.toString()}`, { cache: 'no-store' });
      const d = await res.json();
      setTickets((d.tickets ?? []).sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch {} finally { setBulkSaving(false); }
  };

  const exportCSV = () => {
    const toExport = selectedIds.size > 0
      ? filteredTickets.filter((t) => selectedIds.has(t.id))
      : filteredTickets;
    const rows = [
      ['Key', 'Title', 'Status', 'Priority', 'Project', 'Created'],
      ...toExport.map((t) => [
        t.ticketKey ?? t.id,
        `"${t.title.replace(/"/g, '""')}"`,
        t.status,
        t.priority,
        t.project?.name ?? '',
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTickets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTickets.map((t) => t.id)));
    }
  };

  useEffect(() => {
    fetch('/api/dashboard/projects', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : { projects: [] })
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {});
  }, [is3SCTeam]);

  // Load clients for 3SC team + agents for Lead filters
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

  useEffect(() => {
    setActiveTab(statusParam === 'ALL' ? 'ALL' : statusParam);
  }, [statusParam]);

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeTab !== 'ALL') params.append('status', activeTab);
        const res = await fetch(`/api/dashboard/tickets?${params.toString()}`, { cache: 'no-store' });
        const data = await res.json();
        const sorted = (data.tickets || []).sort(
          (a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setTickets(sorted);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [activeTab]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const socket = getSocket();

    const joinRoom = () => socket.emit('join:tickets');
    if (socket.connected) joinRoom();
    socket.on('connect', joinRoom);

    socket.on('ticket:updated', (updated: Ticket) => {
      setTickets((prev) =>
        prev.some((t) => t.id === updated.id)
          ? prev
              .map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          : prev
      );
    });
    return () => {
      socket.off('connect', joinRoom);
      socket.off('ticket:updated');
    };
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'ALL') {
      router.push('/tickets');
    } else {
      router.push(`/tickets?status=${tab}`);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
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
              <span className="text-slate-700 dark:text-slate-300 font-medium">Issues</span>
            </div>
          }
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Page heading */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 pt-5 pb-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              {isClientUser ? 'My Issues' : 'Issues'}
            </h1>
            {/* Status tabs */}
            <div className="flex gap-0 -mb-px">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-[#0052CC] text-[#0052CC] dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets table */}
          <main className="flex-1 overflow-y-auto p-6">

            {/* Filter bar - wraps on multiple lines */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4 pb-2">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052CC] truncate min-w-max"
              >
                <option value="">Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052CC] truncate min-w-max"
              >
                <option value="">Categories</option>
                <option value="BUG">Bug</option>
                <option value="FEATURE">Feature</option>
                <option value="QUESTION">Question</option>
                <option value="OTHER">Other</option>
              </select>

              <select
                value={filterClient}
                onChange={(e) => {
                  setFilterClient(e.target.value);
                  setFilterProject('');
                }}
                className={`text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052CC] min-w-max ${!is3SCTeam ? 'hidden' : ''}`}
                style={{ maxWidth: '140px' }}
              >
                <option value="">Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name.length > 15 ? c.name.slice(0, 12) + '...' : c.name}</option>
                ))}
              </select>

              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052CC] truncate min-w-max"
              >
                <option value="">Projects</option>
                {projects
                  .filter((p) => !filterClient || p.clientId === filterClient)
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.name.length > 20 ? p.name.slice(0, 17) + '...' : p.name}</option>
                  ))}
              </select>

              {isLead && (
                <select
                  value={filterAgent}
                  onChange={(e) => setFilterAgent(e.target.value)}
                  className="text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052CC] truncate min-w-max"
                >
                  <option value="">Agents</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name.length > 15 ? a.name.slice(0, 12) + '...' : a.name}</option>)}
                </select>
              )}

              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="text-xs border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052CC] min-w-max"
              />
              <span className="text-xs text-slate-400">-</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="text-xs border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052CC] min-w-max"
              />

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors whitespace-nowrap"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}

              <div className="ml-auto flex items-center gap-1.5 flex-nowrap">
                {selectedIds.size > 0 && (
                  <>
                    <span className="text-xs font-medium text-[#0052CC] dark:text-blue-400">
                      {selectedIds.size} selected
                    </span>
                    {isLead && (
                      <button
                        onClick={() => setShowBulkReassign(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-[#0052CC] text-white rounded-md hover:bg-[#0747A6] font-medium transition-colors">
                        <Users className="w-3 h-3" />Reassign ({selectedIds.size})
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={exportCSV}
                  title="Export CSV"
                  className="flex items-center gap-1.5 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              {/* Active alert filter indicator */}
              {(filterPriority || filterUnassigned || filterSlaAtRisk || filterSlaBreached) && (
                <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-blue-50 dark:bg-blue-950/20">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Active filter: 
                    {filterPriority && ` Priority: ${filterPriority}`}
                    {filterUnassigned && ` Unassigned Issues`}
                    {filterSlaAtRisk && ` SLA At-Risk`}
                    {filterSlaBreached && ` SLA Breached`}
                  </p>
                </div>
              )}
              
              {/* Table header */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {loading
                    ? 'Loading...'
                    : searchQuery
                    ? `${filteredTickets.length} result${filteredTickets.length !== 1 ? 's' : ''} for "${searchQuery}"`
                    : `${filteredTickets.length} issue${filteredTickets.length !== 1 ? 's' : ''}${hasActiveFilters ? ' (filtered)' : ''}`}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => router.push('/tickets')}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear search
                  </button>
                )}
              </div>

              {loading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-16 text-center">
                  {searchQuery ? (
                    <>
                      <Search className="w-12 h-12 mx-auto mb-4 text-slate-400 opacity-40" />
                      <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        No results for &ldquo;{searchQuery}&rdquo;
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Try a different keyword or ticket key.
                      </p>
                      <Button variant="outline" onClick={() => router.push('/tickets')}>
                        <X className="w-4 h-4 mr-2" />
                        Clear search
                      </Button>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-400 opacity-40" />
                      <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        No issues found
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        {activeTab === 'OPEN' ? 'All caught up — no open issues!' : 'No issues match this filter.'}
                      </p>
                      <Button
                        onClick={() => router.push('/create-ticket')}
                        className="bg-[#0052CC] hover:bg-[#0747A6] text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Issue
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="px-4 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredTickets.length && filteredTickets.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 dark:border-slate-600 text-[#0052CC]"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-28">Key</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex-1">Summary</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-48">Description</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-28">Priority</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-32">Status</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-28">Project</th>
                      {is3SCTeam && <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-28">Customer</th>}
                      {isLead && <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-28">Agent</th>}
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-24">Created</th>
                      {(isClientUser || isLead) && (
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-28">SLA Due</th>
                      )}
                      {isLead && (
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-24">SLA Status</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/80">
                    {filteredTickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        onClick={() => router.push(`/tickets/${ticket.ticketKey ?? ticket.id}`)}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group ${selectedIds.has(ticket.id) ? 'bg-blue-50 dark:bg-blue-950/20' : ''} ${ticket.slaBreached ? 'border-l-4 border-l-red-500' : ticket.slaBreachRisk ? 'border-l-4 border-l-amber-400' : ''}`}
                      >
                        <td className="px-4 py-3.5" onClick={(e) => { e.stopPropagation(); toggleSelect(ticket.id); }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(ticket.id)}
                            onChange={() => toggleSelect(ticket.id)}
                            className="rounded border-slate-300 dark:border-slate-600 text-[#0052CC]"
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs font-bold text-[#0052CC] dark:text-blue-400">
                            {ticket.ticketKey ?? ticket.id}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="text-slate-800 dark:text-slate-200 font-medium group-hover:text-[#0052CC] dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                            {ticket.title}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          {ticket.description ? (
                            <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                              {ticket.description}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5">
                          <PriorityBadge priority={ticket.priority} />
                        </td>
                        <td className="px-3 py-3.5">
                          <StatusLozenge status={ticket.status} />
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {ticket.project?.name ?? '—'}
                          </span>
                        </td>
                        {is3SCTeam && (
                          <td className="px-3 py-3.5 text-xs text-slate-600 dark:text-slate-400">{ticket.client?.name ?? '—'}</td>
                        )}
                        {isLead && (
                          <td className="px-3 py-3.5 text-xs text-slate-600 dark:text-slate-400">{ticket.assignedTo?.name ?? <span className="text-slate-300">Unassigned</span>}</td>
                        )}
                        <td className="px-3 py-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(ticket.createdAt)}
                        </td>
                        {(isClientUser || isLead) && (
                          <td className="px-3 py-3.5 text-xs whitespace-nowrap">
                            {ticket.slaDueAt ? (
                              <span className={ticket.slaBreached ? 'text-red-600 font-semibold flex items-center gap-1' : ticket.slaBreachRisk ? 'text-amber-600 font-medium flex items-center gap-1' : 'text-slate-500 dark:text-slate-400'}>
                                {ticket.slaBreached && <ShieldAlert className="w-3 h-3" />}
                                {formatDate(ticket.slaDueAt)}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        )}
                        {isLead && (
                          <td className="px-3 py-3.5 text-xs">
                            {ticket.slaBreached ? (
                              <span className="flex items-center gap-1 text-red-600 font-semibold"><ShieldAlert className="w-3 h-3" />Breached</span>
                            ) : ticket.slaBreachRisk ? (
                              <span className="text-amber-600 font-medium">At Risk</span>
                            ) : (
                              <span className="text-emerald-600">OK</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Bulk reassign modal */}
      {showBulkReassign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-5 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Bulk Reassign</h3>
            <p className="text-xs text-slate-400 mb-4">{selectedIds.size} issue{selectedIds.size !== 1 ? 's' : ''} selected</p>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Assign to agent</label>
            <select value={bulkAgent} onChange={(e) => setBulkAgent(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0052CC] mb-4 text-slate-800 dark:text-slate-200">
              <option value="">Select agent...</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowBulkReassign(false)} className="flex-1 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleBulkReassign} disabled={!bulkAgent || bulkSaving}
                className="flex-1 py-2 text-sm bg-[#0052CC] hover:bg-[#0747A6] text-white rounded-md font-medium disabled:opacity-50">
                {bulkSaving ? 'Reassigning...' : 'Reassign All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-[#F4F5F7] dark:bg-slate-950">
        <div className="flex items-center gap-2 text-slate-500">
          <div className="w-4 h-4 border-2 border-[#0052CC] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading issues...</span>
        </div>
      </div>
    }>
      <TicketsContent />
    </Suspense>
  );
}
