"use client";

import { useState, useEffect } from "react";
import {
  Users, Mail, ShieldCheck, MoreHorizontal, UserPlus,
  RefreshCw, Ticket, ChevronDown,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  joinedAt: string;
  issuesRaised: number;
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    CLIENT_ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    CLIENT_USER: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  };
  const cls = map[role] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
      {role.replace("CLIENT_", "").replace(/_/g, " ")}
    </span>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function InviteModal({
  onClose,
  onInvite,
}: {
  onClose: () => void;
  onInvite: (email: string, role: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("CLIENT_USER");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    onInvite(email.trim(), role);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
          Invite Team Member
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          They will receive an invitation email to join your workspace.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Email address
            </Label>
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Role
            </Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
            >
              <option value="CLIENT_USER">Member</option>
              <option value="CLIENT_ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-[#0052CC] hover:bg-[#0747A6] text-white"
            >
              Send Invite
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);

  const isAdmin = session?.user?.role === "CLIENT_ADMIN";

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members ?? []);
        setClientName(data.clientName ?? "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleInvite = (email: string, role: string) => {
    // Show as pending invite (no real backend sending)
    setInvitedEmails((prev) => [...prev, email]);
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Team Management
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {clientName || "Your workspace members"}
              </p>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              <button
                onClick={fetchTeam}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => setShowInvite(true)}
                  className="h-7 text-xs bg-[#0052CC] hover:bg-[#0747A6] text-white gap-1.5"
                >
                  <UserPlus className="w-3 h-3" />
                  Invite
                </Button>
              )}
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-5">

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Members", value: members.length, icon: Users, color: "text-blue-600", border: "border-l-blue-500" },
                { label: "Admins", value: members.filter((m) => m.role === "CLIENT_ADMIN").length, icon: ShieldCheck, color: "text-purple-600", border: "border-l-purple-500" },
                { label: "Total Issues Raised", value: members.reduce((s, m) => s + m.issuesRaised, 0), icon: Ticket, color: "text-orange-600", border: "border-l-orange-500" },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div
                    key={i}
                    className={`bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 border-l-4 ${card.border} p-4`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {card.label}
                      </p>
                      <Icon className={`w-4 h-4 ${card.color} opacity-60`} />
                    </div>
                    {loading ? (
                      <div className="h-8 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    ) : (
                      <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Members table */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Members ({members.length})
                </h2>
              </div>

              {loading ? (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : members.length === 0 ? (
                <div className="p-10 text-center">
                  <Users className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No members found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Member</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Role</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Issues Raised</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Joined</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {members.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-[#0052CC] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {getInitials(member.name)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {member.name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {member.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3.5">
                            <RoleBadge role={member.role} />
                          </td>
                          <td className="px-3 py-3.5">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {member.issuesRaised}
                            </span>
                          </td>
                          <td className="px-3 py-3.5">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(member.joinedAt).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </td>
                          <td className="px-3 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                                member.isActive
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-slate-400"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  member.isActive ? "bg-emerald-500" : "bg-slate-400"
                                }`}
                              />
                              {member.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pending invites */}
            {invitedEmails.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Pending Invites
                  </h2>
                </div>
                <div className="p-3 space-y-1">
                  {invitedEmails.map((email, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-sm text-amber-800 dark:text-amber-300">{email}</span>
                      </div>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Invite sent
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvite={handleInvite}
        />
      )}
    </div>
  );
}
