"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle,
  List,
  LogOut,
  ChevronDown,
  ChevronRight,
  Ticket,
  Bell,
  Users,
  BarChart2,
  Settings,
  BookOpen,
  ShieldCheck,
  Bot,
  BarChart3,
  ClipboardList,
  Wrench,
  Building2,
  SlidersHorizontal,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { ThemeSwitcher } from "./theme-switcher";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  indent?: boolean;
  badge?: number;
}

function NavItem({ href, icon, label, active, indent, badge }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
        indent ? "pl-9" : "",
        active
          ? "bg-white/20 text-white shadow-sm"
          : "text-blue-100 hover:bg-white/10 hover:text-white"
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex-shrink-0 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

export function AppSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [ticketsOpen, setTicketsOpen] = useState(true);

  const userRole = session?.user?.role as string | undefined;
  const is3SCTeam =
    userRole &&
    ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(userRole);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isClientUser = userRole === "CLIENT_USER";
  const isClientAdmin = userRole === "CLIENT_ADMIN";
  const isAdmin = userRole === "THREESC_ADMIN";
  const isLead = userRole === "THREESC_LEAD";
  const isAgent = userRole === "THREESC_AGENT";
  const isTicketDetail = pathname.startsWith("/tickets/");
  const isTicketsActive =
    pathname === "/tickets" || isTicketDetail;

  return (
    <div className="w-60 flex-shrink-0 h-full flex flex-col bg-[#0747A6] dark:bg-slate-900 overflow-hidden border-r border-blue-700/30 dark:border-slate-700">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-white/10 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-xs font-black text-[#0052CC]">3S</span>
          </div>
          <div>
            <span className="text-white font-bold text-sm block leading-tight">
              3SC Connect
            </span>
            <span className="text-blue-200/70 text-[10px] block leading-tight">
              Customer Portal
            </span>
          </div>
        </div>
      </div>

      {/* Create Button */}
      <div className="px-3 pt-4 pb-2 flex-shrink-0">
        <Link
          href="/create-ticket"
          className={cn(
            "flex items-center justify-center gap-2 w-full py-2 px-4 rounded-md text-sm font-semibold transition-colors",
            pathname === "/create-ticket"
              ? "bg-white text-[#0052CC]"
              : "bg-white/90 text-[#0052CC] hover:bg-white shadow-sm"
          )}
        >
          <Plus className="w-4 h-4" />
          Create Ticket
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto space-y-0.5">
        <NavItem
          href="/dashboard"
          icon={<LayoutDashboard className="w-4 h-4" />}
          label="Overview"
          active={pathname === "/dashboard"}
        />

        {/* Tickets accordion */}
        <div>
          <button
            onClick={() => setTicketsOpen(!ticketsOpen)}
            className={cn(
              "flex items-center justify-between w-full px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
              isTicketsActive
                ? "bg-white/20 text-white"
                : "text-blue-100 hover:bg-white/10 hover:text-white"
            )}
          >
            <div className="flex items-center gap-2.5">
              <Ticket className="w-4 h-4 flex-shrink-0" />
              <span>Issues</span>
            </div>
            {ticketsOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>

          {ticketsOpen && (
            <div className="mt-0.5 space-y-0.5">
              <NavItem
                href="/tickets"
                icon={<List className="w-3.5 h-3.5" />}
                label={is3SCTeam ? "All Issues" : isClientUser ? "My Issues" : "All Tickets"}
                active={isTicketsActive}
                indent
              />
              <NavItem
                href="/tickets?status=OPEN"
                icon={
                  <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                }
                label="Open"
                indent
              />
              <NavItem
                href="/tickets?status=IN_PROGRESS"
                icon={
                  <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                }
                label="In Progress"
                indent
              />
              <NavItem
                href="/tickets?status=RESOLVED"
                icon={
                  <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                }
                label="Resolved"
                indent
              />
            </div>
          )}
        </div>

        {/* CLIENT_USER-only nav items */}
        {isClientUser && (
          <>
            <NavItem
              href="/knowledge-base"
              icon={<BookOpen className="w-4 h-4" />}
              label="Knowledge Base"
              active={pathname.startsWith("/knowledge-base")}
            />
            <NavItem
              href="/notifications"
              icon={<Bell className="w-4 h-4" />}
              label="Notifications"
              active={pathname === "/notifications"}
            />
          </>
        )}

        {/* CLIENT_ADMIN-only nav items */}
        {isClientAdmin && (
          <>
            <NavItem
              href="/team"
              icon={<Users className="w-4 h-4" />}
              label="Team"
              active={pathname === "/team"}
            />
            <NavItem
              href="/reports"
              icon={<BarChart2 className="w-4 h-4" />}
              label="Reports"
              active={pathname === "/reports"}
            />
            <NavItem
              href="/settings"
              icon={<Settings className="w-4 h-4" />}
              label="Settings"
              active={pathname === "/settings"}
            />
          </>
        )}

        {/* THREESC_LEAD nav */}
        {isLead && (
          <>
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300/60">Lead</p>
            </div>
            <NavItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Overview" active={pathname === "/dashboard" || pathname === "/dashboard/lead"} />
            <NavItem href="/tickets" icon={<Ticket className="w-4 h-4" />} label="All Issues" active={pathname === "/tickets"} />
            <NavItem href="/lead/workload" icon={<Users className="w-4 h-4" />} label="Agent Workload" active={pathname.startsWith("/lead/workload")} />
            <NavItem href="/lead/escalations" icon={<ShieldAlert className="w-4 h-4" />} label="Escalations" active={pathname.startsWith("/lead/escalations")} />
            <NavItem href="/lead/projects" icon={<Layers className="w-4 h-4" />} label="Projects" active={pathname.startsWith("/lead/projects")} />
            <NavItem href="/lead/reports" icon={<BarChart2 className="w-4 h-4" />} label="Reports" active={pathname.startsWith("/lead/reports")} />
          </>
        )}

        {/* THREESC_AGENT nav */}
        {isAgent && (
          <>
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300/60">Agent</p>
            </div>
            <NavItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="My Dashboard" active={pathname === "/dashboard" || pathname === "/dashboard/agent"} />
            <NavItem href="/tickets" icon={<Ticket className="w-4 h-4" />} label="My Issues" active={pathname === "/tickets"} />
            <NavItem href="/agent/kb" icon={<BookOpen className="w-4 h-4" />} label="Knowledge Base" active={pathname.startsWith("/agent/kb")} />
          </>
        )}

        {/* THREESC_ADMIN-only admin nav */}
        {isAdmin && (
          <>
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300/60">Admin</p>
            </div>
            <NavItem
              href="/admin"
              icon={<ShieldCheck className="w-4 h-4" />}
              label="Admin Dashboard"
              active={pathname === "/admin"}
            />
            <NavItem
              href="/admin/customers"
              icon={<Building2 className="w-4 h-4" />}
              label="Customer Workspaces"
              active={pathname.startsWith("/admin/customers")}
            />
            <NavItem
              href="/admin/users"
              icon={<Users className="w-4 h-4" />}
              label="User Management"
              active={pathname.startsWith("/admin/users")}
            />
            <NavItem
              href="/admin/ai-config"
              icon={<Bot className="w-4 h-4" />}
              label="AI Configuration"
              active={pathname.startsWith("/admin/ai-config")}
            />
            <NavItem
              href="/admin/sla-config"
              icon={<SlidersHorizontal className="w-4 h-4" />}
              label="SLA Configuration"
              active={pathname.startsWith("/admin/sla-config")}
            />
            <NavItem
              href="/admin/kb"
              icon={<BookOpen className="w-4 h-4" />}
              label="Knowledge Base"
              active={pathname.startsWith("/admin/kb")}
            />
            <NavItem
              href="/admin/analytics"
              icon={<BarChart3 className="w-4 h-4" />}
              label="Platform Analytics"
              active={pathname.startsWith("/admin/analytics")}
            />
            <NavItem
              href="/admin/audit"
              icon={<ClipboardList className="w-4 h-4" />}
              label="Audit Trail"
              active={pathname.startsWith("/admin/audit")}
            />
            <NavItem
              href="/admin/settings"
              icon={<Wrench className="w-4 h-4" />}
              label="System Settings"
              active={pathname.startsWith("/admin/settings")}
            />
          </>
        )}
      </nav>

      {/* Divider */}
      <div className="px-3 pb-1 flex-shrink-0">
        <div className="border-t border-white/10 dark:border-slate-700" />
      </div>

      {/* Bottom section */}
      <div className="px-2 pb-3 flex-shrink-0 space-y-1">
        {/* Theme switcher row */}
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-blue-200 text-xs">Theme</span>
          <ThemeSwitcher />
        </div>

        {/* User info */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-white/10 transition-colors group">
          <div className="w-7 h-7 bg-white/20 border border-white/30 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {getInitials(session?.user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate leading-tight">
              {session?.user?.name || "User"}
            </p>
            <p className="text-blue-200/70 text-[10px] truncate leading-tight capitalize">
              {(session?.user?.role as string)?.toLowerCase().replace(/_/g, " ")}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-blue-200/60 hover:text-white transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
