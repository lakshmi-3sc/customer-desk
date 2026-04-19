"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ChevronRight, Search, UserCheck, UserX, ChevronDown,
  Mail, Shield, Users, Plus, X, RefreshCw,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  clientMembers: { client: { id: string; name: string } }[];
}

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'THREESC_ADMIN', label: '3SC Admin' },
  { value: 'THREESC_LEAD', label: '3SC Lead' },
  { value: 'THREESC_AGENT', label: '3SC Agent' },
  { value: 'CLIENT_ADMIN', label: 'Client Admin' },
  { value: 'CLIENT_USER', label: 'Client User' },
];

const ROLE_BADGE: Record<string, string> = {
  THREESC_ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  THREESC_LEAD: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  THREESC_AGENT: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  CLIENT_ADMIN: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  CLIENT_USER: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const ROLE_LABEL: Record<string, string> = {
  THREESC_ADMIN: '3SC Admin', THREESC_LEAD: '3SC Lead', THREESC_AGENT: '3SC Agent',
  CLIENT_ADMIN: 'Client Admin', CLIENT_USER: 'Client User',
};

function UserManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState(searchParams.get('clientId') || '');
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterRole) params.set('role', filterRole);
      if (filterStatus) params.set('status', filterStatus);
      if (filterClient) params.set('clientId', filterClient);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) setUsers((await res.json()).users ?? []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchUsers(); }, [filterRole, filterStatus, filterClient]);

  const refresh = () => { setRefreshing(true); fetchUsers(); };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const patchUser = async (userId: string, patch: Record<string, any>) => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...patch }),
    });
    if (res.ok) {
      const { user: updated } = await res.json();
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...updated } : u));
    }
  };

  const toggleActive = async (u: AdminUser) => {
    await patchUser(u.id, { isActive: !u.isActive });
  };

  const saveRole = async () => {
    if (!editUser) return;
    setSaving(true);
    await patchUser(editUser.id, { role: editRole });
    setEditUser(null);
    setSaving(false);
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
              <span className="text-slate-700 dark:text-slate-300 font-medium">User Management</span>
            </div>
          }
          right={
            <button onClick={refresh} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />Refresh
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats bar */}
          <div className="grid grid-cols-5 gap-3 mb-5">
            {ROLE_OPTIONS.slice(1).map((r) => {
              const count = users.filter((u) => u.role === r.value).length;
              return (
                <button key={r.value} onClick={() => setFilterRole(filterRole === r.value ? '' : r.value)}
                  className={`bg-white dark:bg-slate-900 rounded-lg border p-3 text-left transition-colors ${filterRole === r.value ? 'border-[#0052CC] bg-blue-50 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{r.label}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{count}</p>
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-48 max-w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC]" />
            </div>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052CC]">
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052CC]">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {(filterRole || filterStatus || filterClient) && (
              <button onClick={() => { setFilterRole(''); setFilterStatus(''); setFilterClient(''); }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition-colors">
                <X className="w-3 h-3" />Clear
              </button>
            )}
            <p className="ml-auto text-xs text-slate-400">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {['Name', 'Email', 'Role', 'Customer', 'Status', 'Last Updated', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#0747A6] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_BADGE[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {u.clientMembers.map((cm) => cm.client.name).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${u.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(u.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditUser(u); setEditRole(u.role); }}
                            className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1">
                            <Shield className="w-3 h-3" />Role
                          </button>
                          <button onClick={() => toggleActive(u)}
                            className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 ${u.isActive
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                            {u.isActive ? <><UserX className="w-3 h-3" />Deactivate</> : <><UserCheck className="w-3 h-3" />Activate</>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">No users found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* Change role modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Change Role</h3>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">Updating role for <span className="font-semibold text-slate-800 dark:text-slate-200">{editUser.name}</span></p>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0052CC] text-slate-800 dark:text-slate-200">
                {ROLE_OPTIONS.slice(1).map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setEditUser(null)} className="flex-1">Cancel</Button>
                <Button onClick={saveRole} disabled={saving || editRole === editUser.role}
                  className="flex-1 bg-[#0052CC] hover:bg-[#0747A6] text-white">
                  {saving ? 'Saving...' : 'Save Role'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center"><div className="w-5 h-5 border-2 border-[#0052CC] border-t-transparent rounded-full animate-spin" /></div>}>
      <UserManagementContent />
    </Suspense>
  );
}
