import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

const is3SCRole = (role: string) => role.startsWith("THREESC_");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const role = currentUser.role;
    const is3SC = is3SCRole(role);
    let clientId: string | undefined;

    if (!is3SC) {
      const membership = await prisma.clientMember.findFirst({
        where: { userId: currentUser.id },
        select: { clientId: true },
      });

      if (!membership) {
        return NextResponse.json({ error: "No client association found" }, { status: 403 });
      }

      clientId = membership.clientId;
    }

    const dashboardScope: Prisma.IssueWhereInput = clientId ? { clientId } : {};
    const ticketScope: Prisma.IssueWhereInput = {};

    if (role === "CLIENT_USER") {
      ticketScope.raisedById = currentUser.id;
    } else if (role === "CLIENT_ADMIN" && clientId) {
      ticketScope.clientId = clientId;
    } else if (role === "THREESC_AGENT") {
      ticketScope.assignedToId = currentUser.id;
    }

    const [
      metrics,
      tickets,
      reports,
      activity,
      users,
    ] = await Promise.all([
      getMetrics(dashboardScope, clientId, !is3SC),
      getTickets(ticketScope),
      getReports(dashboardScope),
      getActivity(clientId),
      getUsers(currentUser.id, role, clientId),
    ]);

    const response = NextResponse.json({
      metrics,
      tickets,
      reports,
      activity,
      users,
    });

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Client dashboard summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard summary" },
      { status: 500 },
    );
  }
}

async function getMetrics(
  scopeFilter: Prisma.IssueWhereInput,
  clientId: string | undefined,
  isClientUser: boolean,
) {
  const [
    openIssues,
    inProgressIssues,
    resolvedIssues,
    criticalIssues,
    totalIssues,
    slaBreachedCount,
    slaBreachRiskCount,
  ] = await Promise.all([
    prisma.issue.count({ where: { ...scopeFilter, status: "OPEN" } }),
    prisma.issue.count({ where: { ...scopeFilter, status: "IN_PROGRESS" } }),
    prisma.issue.count({ where: { ...scopeFilter, status: "RESOLVED" } }),
    prisma.issue.count({ where: { ...scopeFilter, priority: "CRITICAL" } }),
    prisma.issue.count({ where: scopeFilter }),
    prisma.issue.count({ where: { ...scopeFilter, slaBreached: true } }),
    prisma.issue.count({ where: { ...scopeFilter, slaBreachRisk: true } }),
  ]);

  let avgResolutionTime = 0;
  try {
    const whereSql = clientId
      ? Prisma.sql`WHERE status = 'RESOLVED' AND "resolvedAt" IS NOT NULL AND "clientId" = ${clientId}`
      : Prisma.sql`WHERE status = 'RESOLVED' AND "resolvedAt" IS NOT NULL`;

    const resolutionResult = await prisma.$queryRaw<Array<{ avg_days: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 86400) as avg_days
      FROM "Issue"
      ${whereSql}
    `;

    avgResolutionTime = resolutionResult[0]?.avg_days
      ? Math.round(resolutionResult[0].avg_days * 10) / 10
      : 0;
  } catch {
    avgResolutionTime = 0;
  }

  const teamEfficiencyScore = Math.max(
    0,
    100 - (slaBreachedCount + slaBreachRiskCount * 0.5),
  );

  const activeCustomers = isClientUser
    ? undefined
    : await prisma.client.count({ where: { isActive: true } }).catch(() => 0);

  return {
    activeCustomers,
    openTickets: openIssues,
    inProgressTickets: inProgressIssues,
    resolvedTickets: resolvedIssues,
    criticalIssues,
    avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
    teamEfficiencyScore: Math.round(teamEfficiencyScore),
    slaBreachedCount,
    slaBreachRiskCount,
    totalIssues,
  };
}

async function getTickets(where: Prisma.IssueWhereInput) {
  const rawTickets = await prisma.issue.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      ticketKey: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      category: true,
      slaBreached: true,
      slaBreachRisk: true,
      slaDueAt: true,
      createdAt: true,
      updatedAt: true,
      project: { select: { id: true, name: true } },
      raisedBy: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      _count: { select: { comments: { where: { isInternal: false } } } },
    },
    take: 200,
  });

  return rawTickets.map(({ _count, ...ticket }) => ({
    ...ticket,
    hasResponse: _count.comments > 0,
  }));
}

async function getReports(whereBase: Prisma.IssueWhereInput) {
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const issuesLast8Weeks = await prisma.issue.findMany({
    where: { ...whereBase, createdAt: { gte: eightWeeksAgo } },
    select: { createdAt: true, resolvedAt: true },
  });

  const weeklyMap: Record<string, { created: number; resolved: number }> = {};
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const weekLabel = `W${8 - i} (${d.toLocaleDateString("en-GB", { month: "short", day: "numeric" })})`;
    weeklyMap[weekLabel] = { created: 0, resolved: 0 };
  }

  const weekKeys = Object.keys(weeklyMap);
  issuesLast8Weeks.forEach((issue) => {
    const weeksAgo = Math.floor(
      (Date.now() - new Date(issue.createdAt).getTime()) / (7 * 24 * 3600 * 1000),
    );
    if (weeksAgo < 8) {
      const key = weekKeys[7 - weeksAgo];
      if (key) weeklyMap[key].created++;
    }

    if (issue.resolvedAt) {
      const resolvedWeeksAgo = Math.floor(
        (Date.now() - new Date(issue.resolvedAt).getTime()) / (7 * 24 * 3600 * 1000),
      );
      if (resolvedWeeksAgo < 8) {
        const key = weekKeys[7 - resolvedWeeksAgo];
        if (key) weeklyMap[key].resolved++;
      }
    }
  });

  const priorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
  const categories = ["BUG", "FEATURE_REQUEST", "DATA_ACCURACY", "PERFORMANCE", "ACCESS_SECURITY"] as const;

  const [
    priorityCounts,
    categoryCounts,
    resolvedTotal,
    resolvedNotBreached,
    resolvedIssues,
  ] = await Promise.all([
    Promise.all(priorities.map((priority) => prisma.issue.count({ where: { ...whereBase, priority } }))),
    Promise.all(categories.map((category) => prisma.issue.count({ where: { ...whereBase, category } }))),
    prisma.issue.count({ where: { ...whereBase, status: { in: ["RESOLVED", "CLOSED"] } } }),
    prisma.issue.count({ where: { ...whereBase, status: { in: ["RESOLVED", "CLOSED"] }, slaBreached: false } }),
    prisma.issue.findMany({
      where: { ...whereBase, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
      take: 200,
    }),
  ]);

  const weeklyVolume = Object.entries(weeklyMap).map(([week, counts]) => ({
    week,
    ...counts,
  }));

  const priorityBreakdown = priorities.map((priority, index) => ({
    priority,
    count: priorityCounts[index],
  }));

  const categoryBreakdown = categories.map((category, index) => ({
    category: category.replace("_", " "),
    count: categoryCounts[index],
  }));

  const slaCompliance =
    resolvedTotal > 0 ? Math.round((resolvedNotBreached / resolvedTotal) * 100) : 100;

  const avgResolutionDays =
    resolvedIssues.length > 0
      ? Math.round(
          (resolvedIssues.reduce((sum, issue) => {
            const diff = new Date(issue.resolvedAt!).getTime() - new Date(issue.createdAt).getTime();
            return sum + diff / (1000 * 3600 * 24);
          }, 0) /
            resolvedIssues.length) *
            10,
        ) / 10
      : 0;

  return {
    weeklyVolume,
    priorityBreakdown,
    categoryBreakdown,
    slaCompliance,
    avgResolutionDays,
  };
}

async function getActivity(clientId: string | undefined) {
  const history = await prisma.issueHistory.findMany({
    where: clientId ? { issue: { clientId } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      changedBy: {
        select: { name: true },
      },
      issue: {
        select: {
          id: true,
          ticketKey: true,
          title: true,
        },
      },
    },
  });

  const assignedUserIds = Array.from(new Set(
    history
      .filter((entry) => entry.fieldChanged === "assignedToId")
      .flatMap((entry) => [entry.oldValue, entry.newValue])
      .filter((value): value is string => Boolean(value)),
  ));

  const assignedUsers = assignedUserIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: assignedUserIds } },
        select: { id: true, name: true },
      })
    : [];

  const userNameById = new Map(assignedUsers.map((user) => [user.id, user.name]));
  const actionLabels: Record<string, string> = {
    status: "updated status",
    priority: "updated priority",
    category: "updated category",
    assignedToId: "assigned ticket",
    escalated: "updated escalation",
    title: "updated title",
  };

  const displayValue = (entry: (typeof history)[number], value: string | null) => {
    if (!value) return null;
    if (entry.fieldChanged === "assignedToId") return userNameById.get(value) ?? "Unknown user";
    if (entry.fieldChanged === "escalated" && (value === "true" || value === "false")) return null;
    return value;
  };

  return history.map((entry) => ({
    ...entry,
    actionLabel: actionLabels[entry.fieldChanged] ?? entry.fieldChanged.replace(/([A-Z])/g, " $1").trim(),
    displayOldValue: displayValue(entry, entry.oldValue),
    displayNewValue: displayValue(entry, entry.newValue),
  }));
}

async function getUsers(userId: string, role: string, clientId: string | undefined) {
  if (is3SCRole(role)) {
    return prisma.user.findMany({
      where: {
        role: {
          in: ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"],
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });
  }

  const membership = clientId
    ? await prisma.clientMember.findFirst({
        where: { userId, clientId },
        include: {
          client: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      role: true,
                      isActive: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
    : null;

  if (!membership) return [];

  return membership.client.members
    .map((member) => member.user)
    .filter((user) => user.isActive !== false);
}
