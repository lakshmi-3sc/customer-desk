import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { subDays, subMonths } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "WEEKLY";
    const isInternal = searchParams.get("internal") === "true";

    // For internal summaries (3SC team)
    if (isInternal) {
      const userRole = session.user.role as string;
      if (!["THREESC_LEAD", "THREESC_ADMIN", "THREESC_AGENT"].includes(userRole)) {
        return NextResponse.json({ summary: null });
      }

      // Fetch internal summary (all clients)
      return getInternalSummary(period);
    }

    // For client summaries
    // Get user's clientId from ClientMember
    const clientMember = await prisma.clientMember.findFirst({
      where: { userId: session.user.id as string },
    });

    if (!clientMember) {
      return NextResponse.json({ summary: null });
    }

    // Calculate date range
    const now = new Date();
    const startDate = period === "WEEKLY" ? subDays(now, 7) : subMonths(now, 1);

    // Fetch all client issues in period
    const issues = await prisma.issue.findMany({
      where: {
        clientId: clientMember.clientId,
        createdAt: { gte: startDate },
      },
    });

    // Calculate metrics
    const raised = issues.length;
    const resolved = issues.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length;
    const pending = issues.filter((i) => i.status === "OPEN" || i.status === "IN_PROGRESS").length;
    const slaBreaches = issues.filter((i) => i.slaBreached).length;

    // Calc avg resolution time
    const completedIssues = issues.filter((i) => i.resolvedAt);
    let avgResolutionHours = 0;
    if (completedIssues.length > 0) {
      const times = completedIssues.map((i) => {
        const resolvedTime = new Date(i.resolvedAt!).getTime();
        const createdTime = new Date(i.createdAt).getTime();
        return (resolvedTime - createdTime) / (1000 * 60 * 60);
      });
      avgResolutionHours = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    }

    // Get top blocker (highest priority, oldest)
    const topBlocker = issues
      .filter((i) => i.status !== "RESOLVED" && i.status !== "CLOSED")
      .sort((a, b) => {
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        const aPriority = priorityOrder[a.priority] || 99;
        const bPriority = priorityOrder[b.priority] || 99;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.createdAt.getTime() - b.createdAt.getTime();
      })[0];

    const summary = {
      raised,
      resolved,
      pending,
      slaBreaches,
      avgResolutionHours,
      blocker: topBlocker
        ? {
            id: topBlocker.id,
            title: topBlocker.title,
            priority: topBlocker.priority,
            category: topBlocker.category,
          }
        : null,
      period,
    };

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}

async function getInternalSummary(period: string) {
  const now = new Date();
  const startDate = period === "WEEKLY" ? subDays(now, 7) : subMonths(now, 1);
  const prevStartDate = period === "WEEKLY" ? subDays(now, 14) : subMonths(now, 2);
  const prevEndDate = subDays(startDate, 1);

  // Current period issues
  const currentIssues = await prisma.issue.findMany({
    where: { createdAt: { gte: startDate } },
  });

  // Previous period issues (for comparison)
  const prevIssues = await prisma.issue.findMany({
    where: { createdAt: { gte: prevStartDate, lte: prevEndDate } },
  });

  // Calculate metrics
  const totalRaised = currentIssues.length;
  const prevTotal = prevIssues.length;
  const change = totalRaised - prevTotal;

  const resolved = currentIssues.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length;
  const slaBreaches = currentIssues.filter((i) => i.slaBreached).length;
  const slaAtRisk = currentIssues.filter((i) => i.slaBreachRisk && !i.slaBreached).length;

  // Avg resolution time
  const completedIssues = currentIssues.filter((i) => i.resolvedAt);
  let avgResolutionHours = 0;
  if (completedIssues.length > 0) {
    const times = completedIssues.map((i) => {
      const resolvedTime = new Date(i.resolvedAt!).getTime();
      const createdTime = new Date(i.createdAt).getTime();
      return (resolvedTime - createdTime) / (1000 * 60 * 60);
    });
    avgResolutionHours = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  }

  // Get agent workload
  const agentWorkload = await prisma.user.findMany({
    where: { role: "THREESC_AGENT" },
    select: {
      id: true,
      name: true,
      assignedIssues: {
        where: { createdAt: { gte: startDate } },
        select: { id: true, status: true },
      },
    },
  });

  const topAgent = agentWorkload.reduce((prev, current) =>
    prev.assignedIssues.length > current.assignedIssues.length ? prev : current
  );

  const summary = {
    totalRaised,
    change,
    prevTotal,
    resolved,
    avgResolutionHours,
    slaBreaches,
    slaAtRisk,
    totalOpen: currentIssues.filter((i) => i.status === "OPEN" || i.status === "IN_PROGRESS" || i.status === "ACKNOWLEDGED").length,
    topAgentName: topAgent?.name || "N/A",
    topAgentLoad: topAgent?.assignedIssues.length || 0,
    period,
  };

  return NextResponse.json({ summary });
}
