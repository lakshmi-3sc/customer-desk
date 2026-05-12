"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Plus,
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace-context";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

const SIDEBAR_BG = "#0052CC";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  indent?: boolean;
  badge?: number;
  collapsed?: boolean;
}

function NavItem({ href, icon, label, active, indent, badge, collapsed }: NavItemProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      title={collapsed ? label : ""}
      className={cn(
        "relative group flex items-center gap-2.5 rounded-md font-medium transition-all duration-150",
        collapsed ? "mx-1 px-2.5 py-2.5 justify-center" : "px-3 py-2 justify-start",
        "text-[13px]",
        indent && !collapsed && "ml-5",
        active
          ? "bg-white/[0.12] text-white"
          : "text-white/60 hover:bg-white/[0.07] hover:text-white/90"
      )}
    >
      {/* Active left accent bar */}
      {active && !collapsed && (
        <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-white/80" />
      )}

      <span className={cn("flex-shrink-0 transition-colors", active ? "text-white" : "text-white/50 group-hover:text-white/80")}>
        {icon}
      </span>

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="flex-shrink-0 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[17px] h-[17px] flex items-center justify-center px-1">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}

      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div className="absolute left-full ml-2.5 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg border border-white/10">
          {label}
        </div>
      )}
    </Link>
  );
}

function SectionLabel({ children, collapsed }: { children?: React.ReactNode; collapsed?: boolean }) {
  if (collapsed) {
    return <div className="mx-3 my-2.5 h-px bg-white/10" />;
  }
  return (
    <div className="px-3 pt-5 pb-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
        {children}
      </p>
    </div>
  );
}

export function AppSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { currentWorkspace } = useWorkspace();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return JSON.parse(localStorage.getItem("sidebar-collapsed") || "false");
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
  };

  const userRole = session?.user?.role as string | undefined;
  const is3SCTeam = userRole && ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(userRole);
  const isClientUser = userRole === "CLIENT_USER";
  const isClientAdmin = userRole === "CLIENT_ADMIN";
  const isAdmin = userRole === "THREESC_ADMIN";
  const isLead = userRole === "THREESC_LEAD";
  const isAgent = userRole === "THREESC_AGENT";
  const isTicketDetail = pathname.startsWith("/tickets/");
  const isTicketsActive = pathname === "/tickets" || isTicketDetail;
  const isClientWorkspace = !is3SCTeam;
  const portalName = isClientWorkspace ? currentWorkspace?.name || "3SC Connect" : "3SC Connect";
  const portalSubtitle = isClientWorkspace ? "Workspace" : isAdmin ? "Admin" : isLead ? "Lead" : isAgent ? "Agent" : "Portal";
  const portalInitials = isClientWorkspace ? currentWorkspace?.name.substring(0, 2).toUpperCase() || "3S" : "3S";

  return (
    <div
      className={cn(
        "flex-shrink-0 h-full flex flex-col overflow-hidden transition-all duration-300",
        collapsed ? "w-[64px]" : "w-60"
      )}
      style={{ backgroundColor: SIDEBAR_BG }}
>

      {/* Header */}
      <div className="h-14 flex items-center justify-between gap-2 px-3 border-b border-white/[0.08] flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {isClientWorkspace && currentWorkspace?.logoUrl ? (
              <img
                src={currentWorkspace.logoUrl}
                alt={currentWorkspace.name}
                className="w-7 h-7 rounded-md flex-shrink-0 object-cover ring-1 ring-white/20"
              />
            ) : (
              <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 bg-white/10 border border-white/20">
                <span className="text-[11px] font-bold text-white">{portalInitials}</span>
              </div>
            )}
            <div className="min-w-0">
              <span className="text-white font-semibold text-[13px] block leading-tight truncate">{portalName}</span>
              <span className="text-white/40 text-[10px] block leading-tight">{portalSubtitle}</span>
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md transition-colors text-white/40 hover:text-white hover:bg-white/10 flex-shrink-0"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Workspace Switcher */}
      {!collapsed && isClientWorkspace && <WorkspaceSwitcher />}

      {/* Create Ticket button — clients only */}
      {!is3SCTeam && !collapsed && (
        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <Link
            href="/create-ticket"
            prefetch={false}
            className={cn(
              "flex items-center justify-center gap-1.5 w-full py-1.5 px-4 rounded-md text-[13px] font-semibold text-white transition-all shadow-sm",
              "bg-white/15 hover:bg-white/20 border border-white/20"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Create Ticket
          </Link>
        </div>
      )}

      {!is3SCTeam && collapsed && (
        <div className="px-2 pt-3 pb-2 flex-shrink-0">
          <Link
            href="/create-ticket"
            prefetch={false}
            title="Create Ticket"
            className="flex items-center justify-center w-full py-2.5 rounded-md text-white transition-colors bg-white/15 hover:bg-white/20 border border-white/20"
          >
            <Plus className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-2 px-1.5 overflow-y-auto space-y-0.5">
        {!is3SCTeam && (
          <NavItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard"
            active={pathname === "/dashboard"} collapsed={collapsed} />
        )}
        {!is3SCTeam && (
          <NavItem href="/tickets" icon={<Ticket className="w-4 h-4" />} label="Issues"
            active={isTicketsActive} collapsed={collapsed} />
        )}

        {isClientUser && (
          <>
            <NavItem href="/knowledge-base" icon={<BookOpen className="w-4 h-4" />} label="Knowledge Base"
              active={pathname.startsWith("/knowledge-base")} collapsed={collapsed} />
            <NavItem href="/notifications" icon={<Bell className="w-4 h-4" />} label="Notifications"
              active={pathname === "/notifications"} collapsed={collapsed} />
          </>
        )}

        {isClientAdmin && (
          <>
            <NavItem href="/knowledge-base" icon={<BookOpen className="w-4 h-4" />} label="Knowledge Base"
              active={pathname.startsWith("/knowledge-base")} collapsed={collapsed} />
            <NavItem href="/team" icon={<Users className="w-4 h-4" />} label="Team"
              active={pathname === "/team"} collapsed={collapsed} />
            <NavItem href="/reports" icon={<BarChart2 className="w-4 h-4" />} label="Reports"
              active={pathname === "/reports"} collapsed={collapsed} />
            <NavItem href="/settings" icon={<Settings className="w-4 h-4" />} label="Settings"
              active={pathname === "/settings"} collapsed={collapsed} />
          </>
        )}

        {isLead && (
          <>
            <SectionLabel collapsed={collapsed}>Lead</SectionLabel>
            <NavItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard"
              active={pathname === "/dashboard"} collapsed={collapsed} />
            <NavItem href="/tickets" icon={<Ticket className="w-4 h-4" />} label="All Issues"
              active={pathname === "/tickets"} collapsed={collapsed} />
            <NavItem href="/lead/workload" icon={<Users className="w-4 h-4" />} label="Workload"
              active={pathname.startsWith("/lead/workload")} collapsed={collapsed} />
            <NavItem href="/lead/escalations" icon={<ShieldAlert className="w-4 h-4" />} label="Escalations"
              active={pathname.startsWith("/lead/escalations")} collapsed={collapsed} />
            <NavItem href="/lead/projects" icon={<Layers className="w-4 h-4" />} label="Projects"
              active={pathname.startsWith("/lead/projects")} collapsed={collapsed} />
            <NavItem href="/lead/reports" icon={<BarChart2 className="w-4 h-4" />} label="Reports"
              active={pathname.startsWith("/lead/reports")} collapsed={collapsed} />
          </>
        )}

        {isAgent && (
          <>
            <SectionLabel collapsed={collapsed}>Agent</SectionLabel>
            <NavItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard"
              active={pathname === "/dashboard"} collapsed={collapsed} />
            <NavItem href="/tickets" icon={<Ticket className="w-4 h-4" />} label="Issues"
              active={pathname === "/tickets"} collapsed={collapsed} />
            <NavItem href="/agent/kb" icon={<BookOpen className="w-4 h-4" />} label="Knowledge Base"
              active={pathname.startsWith("/agent/kb")} collapsed={collapsed} />
          </>
        )}

        {isAdmin && (
          <>
            <SectionLabel collapsed={collapsed}>Admin</SectionLabel>
            <NavItem href="/admin" icon={<ShieldCheck className="w-4 h-4" />} label="Dashboard"
              active={pathname === "/admin"} collapsed={collapsed} />
            <NavItem href="/tickets" icon={<Ticket className="w-4 h-4" />} label="Issues"
              active={isTicketsActive} collapsed={collapsed} />
            <NavItem href="/admin/customers" icon={<Building2 className="w-4 h-4" />} label="Workspaces"
              active={pathname.startsWith("/admin/customers")} collapsed={collapsed} />
            <NavItem href="/admin/users" icon={<Users className="w-4 h-4" />} label="Users"
              active={pathname.startsWith("/admin/users")} collapsed={collapsed} />
            <NavItem href="/admin/ai-config" icon={<Bot className="w-4 h-4" />} label="AI Config"
              active={pathname.startsWith("/admin/ai-config")} collapsed={collapsed} />
            <NavItem href="/admin/sla-config" icon={<SlidersHorizontal className="w-4 h-4" />} label="SLA Config"
              active={pathname.startsWith("/admin/sla-config")} collapsed={collapsed} />
            <NavItem href="/admin/kb" icon={<BookOpen className="w-4 h-4" />} label="Knowledge Base"
              active={pathname.startsWith("/admin/kb")} collapsed={collapsed} />
            <NavItem href="/admin/analytics" icon={<BarChart3 className="w-4 h-4" />} label="Analytics"
              active={pathname.startsWith("/admin/analytics")} collapsed={collapsed} />
            <NavItem href="/admin/audit" icon={<ClipboardList className="w-4 h-4" />} label="Audit"
              active={pathname.startsWith("/admin/audit")} collapsed={collapsed} />
            <NavItem href="/admin/settings" icon={<Wrench className="w-4 h-4" />} label="Settings"
              active={pathname.startsWith("/admin/settings")} collapsed={collapsed} />
          </>
        )}
      </nav>
    </div>
  );
}
