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
      title={collapsed ? label : ""}
      className={cn(
        "relative group flex items-center gap-2.5 rounded-md font-medium transition-colors duration-150",
        collapsed ? "mx-1 px-2.5 py-2.5 justify-center" : "px-3 py-2 justify-start",
        "text-sm",
        indent && !collapsed && "ml-6",
        active
          ? "bg-white/20 text-white shadow-sm"
          : "text-blue-100 hover:bg-white/10 hover:text-white"
      )}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-white" />
      )}
      <span className={cn("flex-shrink-0", active ? "text-white" : "text-blue-100/80")}>
        {icon}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="flex-shrink-0 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}

      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-950 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
          {label}
        </div>
      )}
    </Link>
  );
}

function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed?: boolean }) {
  if (collapsed) {
    return <div className="mx-3 my-2 h-px bg-white/15" />;
  }

  return (
    <div className="px-3 pt-4 pb-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-200/70">
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

  // Save sidebar state to localStorage
  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
  };

  const userRole = session?.user?.role as string | undefined;
  const is3SCTeam =
    userRole &&
    ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(userRole);

  const isClientUser = userRole === "CLIENT_USER";
  const isClientAdmin = userRole === "CLIENT_ADMIN";
  const isAdmin = userRole === "THREESC_ADMIN";
  const isLead = userRole === "THREESC_LEAD";
  const isAgent = userRole === "THREESC_AGENT";
  const isTicketDetail = pathname.startsWith("/tickets/");
  const isTicketsActive =
    pathname === "/tickets" || isTicketDetail;

  const isClientWorkspace = !is3SCTeam;
  const sidebarColor = "#0052CC";
  const portalName = isClientWorkspace ? currentWorkspace?.name || "3SC Connect" : "3SC Connect";
  const portalSubtitle = isClientWorkspace ? "Workspace" : isAdmin ? "Admin Portal" : isLead ? "Lead Portal" : isAgent ? "Agent Portal" : "Portal";
  const portalInitials = isClientWorkspace ? currentWorkspace?.name.substring(0, 2).toUpperCase() || "3S" : "3S";

  return (
    <div
      className={cn(
        "flex-shrink-0 h-full flex flex-col overflow-hidden border-r border-blue-900/20 transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64"
      )}
      style={{ backgroundColor: sidebarColor }}
    >
      {/* Header with Logo & Toggle */}
      <div className="h-14 flex items-center justify-between gap-2 px-3 border-b border-white/10 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {isClientWorkspace && currentWorkspace?.logoUrl ? (
              <img
                src={currentWorkspace.logoUrl}
                alt={currentWorkspace.name}
                className="w-8 h-8 rounded-md flex-shrink-0 object-cover ring-1 ring-white/20"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-white text-[#0052CC] shadow-sm"
              >
                <span className="text-xs font-black">
                  {portalInitials}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <span className="text-white font-semibold text-sm block leading-tight truncate">
                {portalName}
              </span>
              <span className="text-blue-100/70 text-[11px] block leading-tight">
                {portalSubtitle}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md transition-colors text-blue-100 hover:bg-white/10 hover:text-white flex-shrink-0"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      {/* Workspace Switcher */}
      {!collapsed && isClientWorkspace && <WorkspaceSwitcher />}

      {/* Create Button — clients only */}
      {!is3SCTeam && !collapsed && (
        <div className="px-3 pt-4 pb-3 flex-shrink-0">
          <Link
            href="/create-ticket"
            className={cn(
              "flex items-center justify-center gap-2 w-full py-2 px-4 rounded-md text-sm font-semibold text-white transition-colors shadow-sm",
              pathname === "/create-ticket"
                ? "opacity-95"
                : "hover:opacity-90"
            )}
            style={{ backgroundColor: sidebarColor }}
          >
            <Plus className="w-4 h-4" />
            Create Ticket
          </Link>
        </div>
      )}

      {!is3SCTeam && collapsed && (
        <div className="px-2 pt-4 pb-2 flex-shrink-0">
          <Link
            href="/create-ticket"
            title="Create Ticket"
            className="flex items-center justify-center w-full py-2.5 px-3 rounded-md text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: sidebarColor }}
          >
            <Plus className="w-5 h-5" />
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
        {!is3SCTeam && (
          <NavItem
            href="/dashboard"
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Dashboard"
            active={pathname === "/dashboard"}
            collapsed={collapsed}
          />
        )}

        {!is3SCTeam && (
          <NavItem
            href="/tickets"
            icon={<Ticket className="w-5 h-5" />}
            label="Issues"
            active={isTicketsActive}
            collapsed={collapsed}
          />
        )}

        {/* CLIENT_USER-only nav items */}
        {isClientUser && (
          <>
            <NavItem
              href="/knowledge-base"
              icon={<BookOpen className="w-5 h-5" />}
              label="Knowledge Base"
              active={pathname.startsWith("/knowledge-base")}
              collapsed={collapsed}
            />
            <NavItem
              href="/notifications"
              icon={<Bell className="w-5 h-5" />}
              label="Notifications"
              active={pathname === "/notifications"}
              collapsed={collapsed}
            />
          </>
        )}

        {/* CLIENT_ADMIN-only nav items */}
        {isClientAdmin && (
          <>
            <NavItem
              href="/knowledge-base"
              icon={<BookOpen className="w-5 h-5" />}
              label="Knowledge Base"
              active={pathname.startsWith("/knowledge-base")}
              collapsed={collapsed}
            />
            <NavItem
              href="/team"
              icon={<Users className="w-5 h-5" />}
              label="Team"
              active={pathname === "/team"}
              collapsed={collapsed}
            />
            <NavItem
              href="/reports"
              icon={<BarChart2 className="w-5 h-5" />}
              label="Reports"
              active={pathname === "/reports"}
              collapsed={collapsed}
            />
            <NavItem
              href="/settings"
              icon={<Settings className="w-5 h-5" />}
              label="Settings"
              active={pathname === "/settings"}
              collapsed={collapsed}
            />
          </>
        )}

        {/* THREESC_LEAD nav */}
        {isLead && !collapsed && (
          <>
            <SectionLabel>Lead</SectionLabel>
            <NavItem href="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" active={pathname === "/dashboard"} collapsed={collapsed} />
            <NavItem href="/tickets" icon={<Ticket className="w-5 h-5" />} label="All Issues" active={pathname === "/tickets"} collapsed={collapsed} />
            <NavItem href="/lead/workload" icon={<Users className="w-5 h-5" />} label="Workload" active={pathname.startsWith("/lead/workload")} collapsed={collapsed} />
            <NavItem href="/lead/escalations" icon={<ShieldAlert className="w-5 h-5" />} label="Escalations" active={pathname.startsWith("/lead/escalations")} collapsed={collapsed} />
            <NavItem href="/lead/projects" icon={<Layers className="w-5 h-5" />} label="Projects" active={pathname.startsWith("/lead/projects")} collapsed={collapsed} />
            <NavItem href="/lead/reports" icon={<BarChart2 className="w-5 h-5" />} label="Reports" active={pathname.startsWith("/lead/reports")} collapsed={collapsed} />
          </>
        )}

        {isLead && collapsed && (
          <>
            <SectionLabel collapsed />
            <NavItem href="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" active={pathname === "/dashboard"} collapsed={collapsed} />
            <NavItem href="/tickets" icon={<Ticket className="w-5 h-5" />} label="Issues" active={pathname === "/tickets"} collapsed={collapsed} />
            <NavItem href="/lead/workload" icon={<Users className="w-5 h-5" />} label="Workload" active={pathname.startsWith("/lead/workload")} collapsed={collapsed} />
            <NavItem href="/lead/escalations" icon={<ShieldAlert className="w-5 h-5" />} label="Escalations" active={pathname.startsWith("/lead/escalations")} collapsed={collapsed} />
            <NavItem href="/lead/projects" icon={<Layers className="w-5 h-5" />} label="Projects" active={pathname.startsWith("/lead/projects")} collapsed={collapsed} />
            <NavItem href="/lead/reports" icon={<BarChart2 className="w-5 h-5" />} label="Reports" active={pathname.startsWith("/lead/reports")} collapsed={collapsed} />
          </>
        )}

        {/* THREESC_AGENT nav */}
        {isAgent && (
          <>
            <SectionLabel collapsed={collapsed}>Agent</SectionLabel>
            <NavItem href="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" active={pathname === "/dashboard"} collapsed={collapsed} />
            <NavItem href="/tickets" icon={<Ticket className="w-5 h-5" />} label="Issues" active={pathname === "/tickets"} collapsed={collapsed} />
            <NavItem href="/agent/kb" icon={<BookOpen className="w-5 h-5" />} label="Knowledge Base" active={pathname.startsWith("/agent/kb")} collapsed={collapsed} />
          </>
        )}

        {/* THREESC_ADMIN-only admin nav */}
        {isAdmin && !collapsed && (
          <>
            <SectionLabel>Admin</SectionLabel>
            <NavItem
              href="/admin"
              icon={<ShieldCheck className="w-5 h-5" />}
              label="Dashboard"
              active={pathname === "/admin"}
              collapsed={collapsed}
            />
            <NavItem
              href="/tickets"
              icon={<Ticket className="w-5 h-5" />}
              label="Issues"
              active={isTicketsActive}
              collapsed={collapsed}
            />
            <NavItem
              href="/admin/customers"
              icon={<Building2 className="w-5 h-5" />}
              label="Workspaces"
              active={pathname.startsWith("/admin/customers")}
              collapsed={collapsed}
            />
            <NavItem
              href="/admin/users"
              icon={<Users className="w-5 h-5" />}
              label="Users"
              active={pathname.startsWith("/admin/users")}
              collapsed={collapsed}
            />
            <NavItem
              href="/admin/ai-config"
              icon={<Bot className="w-5 h-5" />}
              label="AI Config"
              active={pathname.startsWith("/admin/ai-config")}
              collapsed={collapsed}
            />
            <NavItem
              href="/admin/sla-config"
              icon={<SlidersHorizontal className="w-5 h-5" />}
              label="SLA Config"
              active={pathname.startsWith("/admin/sla-config")}
              collapsed={collapsed}
            />
            <NavItem
              href="/admin/kb"
              icon={<BookOpen className="w-5 h-5" />}
              label="Knowledge Base"
              active={pathname.startsWith("/admin/kb")}
              collapsed={collapsed}
            />
            <NavItem
              href="/admin/analytics"
              icon={<BarChart3 className="w-5 h-5" />}
              label="Analytics"
              active={pathname.startsWith("/admin/analytics")}
              collapsed={collapsed}
            />
            <NavItem
              href="/admin/audit"
              icon={<ClipboardList className="w-5 h-5" />}
              label="Audit"
              active={pathname.startsWith("/admin/audit")}
              collapsed={collapsed}
            />
            <NavItem
              href="/admin/settings"
              icon={<Wrench className="w-5 h-5" />}
              label="Settings"
              active={pathname.startsWith("/admin/settings")}
              collapsed={collapsed}
            />
          </>
        )}

        {isAdmin && collapsed && (
          <>
            <SectionLabel collapsed />
            <NavItem href="/admin" icon={<ShieldCheck className="w-5 h-5" />} label="Dashboard" active={pathname === "/admin"} collapsed={collapsed} />
            <NavItem href="/tickets" icon={<Ticket className="w-5 h-5" />} label="Issues" active={isTicketsActive} collapsed={collapsed} />
            <NavItem href="/admin/customers" icon={<Building2 className="w-5 h-5" />} label="Workspaces" active={pathname.startsWith("/admin/customers")} collapsed={collapsed} />
            <NavItem href="/admin/users" icon={<Users className="w-5 h-5" />} label="Users" active={pathname.startsWith("/admin/users")} collapsed={collapsed} />
            <NavItem href="/admin/ai-config" icon={<Bot className="w-5 h-5" />} label="AI" active={pathname.startsWith("/admin/ai-config")} collapsed={collapsed} />
            <NavItem href="/admin/sla-config" icon={<SlidersHorizontal className="w-5 h-5" />} label="SLA" active={pathname.startsWith("/admin/sla-config")} collapsed={collapsed} />
            <NavItem href="/admin/kb" icon={<BookOpen className="w-5 h-5" />} label="KB" active={pathname.startsWith("/admin/kb")} collapsed={collapsed} />
            <NavItem href="/admin/analytics" icon={<BarChart3 className="w-5 h-5" />} label="Analytics" active={pathname.startsWith("/admin/analytics")} collapsed={collapsed} />
            <NavItem href="/admin/audit" icon={<ClipboardList className="w-5 h-5" />} label="Audit" active={pathname.startsWith("/admin/audit")} collapsed={collapsed} />
            <NavItem href="/admin/settings" icon={<Wrench className="w-5 h-5" />} label="Settings" active={pathname.startsWith("/admin/settings")} collapsed={collapsed} />
          </>
        )}
      </nav>
    </div>
  );
}
