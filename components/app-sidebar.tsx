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
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

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
        "flex items-center gap-2.5 rounded-md font-medium transition-all duration-200 relative group",
        collapsed ? "px-3 py-2.5 justify-center" : "px-3 py-2 justify-start",
        "text-sm",
        active
          ? "bg-white/20 text-white shadow-sm"
          : "text-blue-100 hover:bg-white/10 hover:text-white"
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
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
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </Link>
  );
}

export function AppSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [ticketsOpen, setTicketsOpen] = useState(true);

  // Load sidebar state from localStorage
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) {
      setCollapsed(JSON.parse(saved));
    }
  }, []);

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

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "flex-shrink-0 h-full flex flex-col bg-[#0747A6] dark:bg-slate-900 overflow-hidden border-r border-blue-700/30 dark:border-slate-700 transition-all duration-300",
        collapsed ? "w-20" : "w-60"
      )}
    >
      {/* Header with Logo & Toggle */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-white/10 dark:border-slate-700 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xs font-black text-[#0052CC]">3S</span>
            </div>
            <div className="min-w-0">
              <span className="text-white font-bold text-sm block leading-tight truncate">
                3SC Connect
              </span>
              <span className="text-blue-200/70 text-[10px] block leading-tight">
                Portal
              </span>
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-blue-100 hover:text-white flex-shrink-0"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>

      {/* Create Button — clients only */}
      {!is3SCTeam && !collapsed && (
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
      )}

      {!is3SCTeam && collapsed && (
        <div className="px-2 pt-4 pb-2 flex-shrink-0">
          <Link
            href="/create-ticket"
            title="Create Ticket"
            className="flex items-center justify-center w-full py-2.5 px-3 rounded-md bg-white/90 text-[#0052CC] hover:bg-white transition-colors"
          >
            <Plus className="w-5 h-5" />
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto space-y-0.5">
        <NavItem
          href="/dashboard"
          icon={<LayoutDashboard className="w-5 h-5" />}
          label="Dashboard"
          active={pathname === "/dashboard"}
          collapsed={collapsed}
        />

        {/* Tickets Accordion */}
        {!collapsed && (
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
                <Ticket className="w-5 h-5 flex-shrink-0" />
                <span>Issues</span>
              </div>
              <ChevronRight className={cn("w-3 h-3 transition-transform", ticketsOpen && "rotate-90")} />
            </button>

            {ticketsOpen && (
              <div className="mt-0.5 space-y-0.5">
                <NavItem
                  href="/tickets"
                  icon={<div className="w-2 h-2 rounded-full bg-slate-300" />}
                  label={is3SCTeam ? "All Issues" : isClientUser ? "My Issues" : "All Tickets"}
                  active={pathname === "/tickets"}
                  indent
                  collapsed={collapsed}
                />
              </div>
            )}
          </div>
        )}

        {collapsed && (
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
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300/60">Lead</p>
            </div>
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
            {!collapsed && <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300/60">Agent</p>
            </div>}
            <NavItem href="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" active={pathname === "/dashboard"} collapsed={collapsed} />
            <NavItem href="/tickets" icon={<Ticket className="w-5 h-5" />} label="Issues" active={pathname === "/tickets"} collapsed={collapsed} />
            <NavItem href="/agent/kb" icon={<BookOpen className="w-5 h-5" />} label="Knowledge Base" active={pathname.startsWith("/agent/kb")} collapsed={collapsed} />
          </>
        )}

        {/* THREESC_ADMIN-only admin nav */}
        {isAdmin && !collapsed && (
          <>
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300/60">Admin</p>
            </div>
            <NavItem
              href="/admin"
              icon={<ShieldCheck className="w-5 h-5" />}
              label="Dashboard"
              active={pathname === "/admin"}
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
            <NavItem href="/admin" icon={<ShieldCheck className="w-5 h-5" />} label="Dashboard" active={pathname === "/admin"} collapsed={collapsed} />
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
