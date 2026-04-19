"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Search, Filter, Download, Clock, User, Settings, X } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";

interface AuditEntry {
  id: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  changedBy: { id: string; name: string; role: string };
  issue: { ticketKey: string | null; title: string; id: string } | null;
}

const ACTION_COLOR: Record<string, string> = {
  status: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  priority: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  assignedToId: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  title: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

function groupByDate(entries: AuditEntry[]) {
  const groups: Record<string, AuditEntry[]> = {};
  entries.forEach((e) => {
    const d = new Date(e.changedAt);
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    let key: string;
    if (d.toDateString() === today.toDateString()) key = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) key = 'Yesterday';
    else key = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  return groups;
}

export default function AuditTrailPage() {
  const router = useRouter();
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);
      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (res.ok) setAudit((await res.json()).audit ?? []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchAudit(); }, [filterFrom, filterTo]);

  const filtered = audit.filter((e) => {
    const matchQ = !search || e.changedBy.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.issue?.ticketKey ?? '').toLowerCase().includes(search.toLowerCase()) ||
      e.fieldChanged.toLowerCase().includes(search.toLowerCase());
    const matchAction = !filterAction || e.fieldChanged === filterAction;
    return matchQ && matchAction;
  });

  const grouped = groupByDate(filtered);

  const exportCSV = () => {
    const rows = [['Time', 'Actor', 'Action', 'Old Value', 'New Value', 'Ticket'],
      ...filtered.map((e) => [
        new Date(e.changedAt).toLocaleString('en-GB'),
        e.changedBy.name,
        e.fieldChanged,
        e.oldValue ?? '',
        e.newValue ?? '',
        e.issue?.ticketKey ?? e.issue?.id ?? '',
      ])];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
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
              <span className="text-slate-700 dark:text-slate-300 font-medium">Audit Trail</span>
            </div>
          }
          right={
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors">
              <Download className="w-3.5 h-3.5" />Export CSV
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <div className="relative flex-1 min-w-48 max-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actor, ticket, action..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC]" />
            </div>
            <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052CC]">
              <option value="">All Actions</option>
              <option value="status">Status Change</option>
              <option value="priority">Priority Change</option>
              <option value="assignedToId">Assignment</option>
              <option value="title">Title Edit</option>
            </select>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>From</span>
              <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
                className="text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052CC]" />
              <span>To</span>
              <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
                className="text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052CC]" />
            </div>
            {(filterFrom || filterTo || filterAction || search) && (
              <button onClick={() => { setSearch(''); setFilterFrom(''); setFilterTo(''); setFilterAction(''); }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600">
                <X className="w-3 h-3" />Clear
              </button>
            )}
            <p className="ml-auto text-xs text-slate-400">{filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}</p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => <div key={i} className="h-14 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 animate-pulse" />)}
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="py-16 text-center">
              <Clock className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500">No audit entries found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([date, entries]) => (
                <div key={date}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{date}</p>
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <div key={entry.id} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3 flex items-start gap-4">
                        {/* Actor avatar */}
                        <div className="w-7 h-7 rounded-full bg-[#0747A6] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {entry.changedBy.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{entry.changedBy.name}</span>
                            <span className="text-xs text-slate-400 capitalize">{entry.changedBy.role.replace(/_/g, ' ').toLowerCase()}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${ACTION_COLOR[entry.fieldChanged] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}>
                              {entry.fieldChanged.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            {entry.oldValue && (
                              <><span className="line-through text-slate-400">{entry.oldValue}</span><span>→</span></>
                            )}
                            {entry.newValue && <span className="font-medium text-slate-700 dark:text-slate-300">{entry.newValue}</span>}
                            {entry.issue && (
                              <button onClick={() => router.push(`/tickets/${entry.issue!.ticketKey ?? entry.issue!.id}`)}
                                className="ml-1 font-mono text-[#0052CC] dark:text-blue-400 hover:underline">
                                {entry.issue.ticketKey ?? entry.issue.id}
                              </button>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                          {new Date(entry.changedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
