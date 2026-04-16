"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Ticket,
  Zap,
  LogOut,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "next-auth/react";

// Helper function to convert API data to metrics format
function getApiBasedMetrics(kpiData: any) {
  return [
    {
      label: "Open tickets",
      value: kpiData.openTickets || 0,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      icon: AlertCircle,
    },
    {
      label: "In progress",
      value: kpiData.inProgressTickets || 0,
      subtext: `${Math.round(kpiData.avgResolutionTime || 0)} days avg`,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      icon: Clock,
    },
    {
      label: "Resolved",
      value: kpiData.resolvedTickets || 0,
      color: "text-green-600",
      bgColor: "bg-green-50",
      icon: CheckCircle,
    },
    {
      label: "Support score",
      value: `${kpiData.teamEfficiencyScore || 0}%`,
      subtext: "score",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      icon: Ticket,
    },
  ];
}

export default function ClientDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [kpiData, setKpiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch KPI data from API
  useEffect(() => {
    const fetchKPIData = async () => {
      try {
        const response = await fetch("/api/dashboard/kpi");
        if (response.ok) {
          const data = await response.json();
          setKpiData(data.metrics);
        }
      } catch (error) {
        console.error("Failed to fetch KPI data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIData();
  }, []);

  // Get user initials for avatar
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm flex-shrink-0">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-red-600 dark:bg-red-500 rounded flex items-center justify-center text-white font-bold">
                C
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                Colgate Portal
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push("/create-ticket")}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
            >
              + Create Ticket
            </Button>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center text-white font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors cursor-pointer"
              >
                {getInitials(session?.user?.name)}
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {session?.user?.name || "User"}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {session?.user?.role}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      signOut({ callbackUrl: "/login" });
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <Main
        kpiData={kpiData}
        getApiBasedMetrics={getApiBasedMetrics}
        loading={loading}
      />
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card className="bg-slate-100 dark:bg-slate-800/50 border-0 dark:border-slate-800 shadow-none">
      <CardContent className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-20 mb-4"></div>
          <div className="h-10 bg-slate-300 dark:bg-slate-700 rounded w-16"></div>
        </div>
      </CardContent>
    </Card>
  );
}

function Main({
  kpiData,
  getApiBasedMetrics,
  loading,
}: {
  kpiData: any;
  getApiBasedMetrics: (data: any) => any;
  loading: boolean;
}) {
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  // Fetch recent tickets with auto-refresh
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await fetch("/api/dashboard/tickets?status=OPEN", {
          cache: "no-store",
        });
        if (response.ok) {
          const data = await response.json();
          // Sort by updatedAt in descending order (most recent first)
          const sortedTickets = (data.tickets || [])
            .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 5);
          setTickets(sortedTickets);
        }
      } catch (error) {
        console.error("Failed to fetch tickets:", error);
      } finally {
        setTicketsLoading(false);
      }
    };

    fetchTickets();

    // Auto-refresh tickets every 30 seconds
    const interval = setInterval(fetchTickets, 30000);
    return () => clearInterval(interval);
  }, []);

  const getRouteForMetric = (label: string) => {
    if (label.toLowerCase().includes("open")) {
      return "/tickets?status=OPEN";
    }
    if (label.toLowerCase().includes("progress")) {
      return "/tickets?status=IN_PROGRESS";
    }
    if (label.toLowerCase().includes("resolved")) {
      return "/tickets?status=RESOLVED";
    }
    return null;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-200";
      case "high":
        return "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-200";
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-200";
      case "low":
        return "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-200";
      default:
        return "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "OPEN":
        return "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-200";
      case "IN_PROGRESS":
        return "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-200";
      case "RESOLVED":
        return "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-200";
      default:
        return "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200";
    }
  };

  return (
    <main className="w-full flex-1 p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Greeting Header */}
        <div className="mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Last updated 2 mins ago
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loading
            ? Array.from({ length: 4 }).map((_, idx) => (
                <SkeletonCard key={idx} />
              ))
            : kpiData
              ? getApiBasedMetrics(kpiData).map((metric: any, idx: number) => {
                  const Icon = metric.icon;
                  const route = getRouteForMetric(metric.label);
                  const darkBgColor = metric.bgColor
                    .replace("bg-blue-50", "dark:bg-blue-950/30")
                    .replace("bg-orange-50", "dark:bg-orange-950/30")
                    .replace("bg-green-50", "dark:bg-green-950/30")
                    .replace("bg-purple-50", "dark:bg-purple-950/30");
                  const darkTextColor = metric.color
                    .replace("text-blue-600", "dark:text-blue-400")
                    .replace("text-orange-600", "dark:text-orange-400")
                    .replace("text-green-600", "dark:text-green-400")
                    .replace("text-purple-600", "dark:text-purple-400");

                  return (
                    <Card
                      key={idx}
                      className={`${metric.bgColor} dark:bg-slate-900/50 border-0 dark:border-slate-800 shadow-none ${
                        route
                          ? "cursor-pointer hover:shadow-lg transition-shadow"
                          : ""
                      }`}
                      onClick={() => route && router.push(route)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                              {metric.label}
                            </p>
                            <div className="flex items-baseline gap-2">
                              <p
                                className={`text-3xl font-bold ${metric.color} ${darkTextColor}`}
                              >
                                {metric.value}
                              </p>
                              {metric.subtext && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {metric.subtext}
                                </p>
                              )}
                            </div>
                          </div>
                          <Icon
                            className={`${metric.color} ${darkTextColor} w-6 h-6 opacity-50`}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              : null}
        </div>

        {/* Summary Section & Recent Tickets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Support Summary */}
          <Card className="lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                <CardTitle className="dark:text-slate-50">
                  Ticket Summary
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="flex gap-3">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      You have{" "}
                      <span className="font-semibold">
                        {kpiData?.openTickets || 0}
                      </span>{" "}
                      open ticket{kpiData?.openTickets !== 1 ? "s" : ""} waiting
                      for resolution
                    </p>
                  </div>
                </div>
                <div className="p-3 border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                  <div className="flex gap-3">
                    <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {kpiData?.inProgressTickets || 0} ticket
                      {kpiData?.inProgressTickets !== 1 ? "s" : ""} currently
                      being worked on
                    </p>
                  </div>
                </div>
                <div className="p-3 border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="flex gap-3">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Avg response time: ~
                      <span className="font-semibold">
                        {Math.round(kpiData?.avgResolutionTime || 0)} days
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card className="dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="dark:text-slate-50 text-sm">
                Recent Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {ticketsLoading ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Loading tickets...
                  </p>
                ) : tickets.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No recent tickets
                  </p>
                ) : (
                  tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() =>
                        router.push(`/tickets/${ticket.id}`)
                      }
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors text-left"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          #{ticket.id.split("-").pop()}
                        </p>
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {ticket.title}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
