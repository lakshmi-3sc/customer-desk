import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { IssueCategory, IssuePriority, IssueStatus, Prisma } from "@prisma/client";

export const revalidate = 0; // No caching - always fresh

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");
    const isPaginated = Boolean(pageParam || pageSizeParam);
    const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(10, Number.parseInt(pageSizeParam ?? "25", 10) || 25));

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const role = currentUser.role;
    const where: Prisma.IssueWhereInput = {};

    const validStatuses = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    const requestedStatus = status?.toUpperCase();
    if (requestedStatus && validStatuses.includes(requestedStatus)) {
      where.status = requestedStatus as IssueStatus;
    }

    if (role === "CLIENT_USER") {
      where.raisedById = currentUser.id;
    } else if (role === "CLIENT_ADMIN") {
      const membership = await prisma.clientMember.findFirst({
        where: { userId: currentUser.id },
      });
      if (membership) where.clientId = membership.clientId;
    } else if (role === "THREESC_AGENT") {
      // Agents only see tickets assigned to them
      where.assignedToId = currentUser.id;
    }
    // THREESC_LEAD and THREESC_ADMIN see all tickets

    const priority = searchParams.get("priority");
    const category = searchParams.get("category");
    const clientId = searchParams.get("clientId");
    const projectId = searchParams.get("projectId");
    const assignedToId = searchParams.get("assignedToId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search")?.trim();

    const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    const validCategories = ["BUG", "FEATURE_REQUEST", "DATA_ACCURACY", "PERFORMANCE", "ACCESS_SECURITY"];

    if (priority && validPriorities.includes(priority)) {
      where.priority = priority as IssuePriority;
    }
    if (category && validCategories.includes(category)) {
      where.category = category as IssueCategory;
    }
    if (projectId) {
      where.projectId = projectId;
    }
    if (clientId && ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(role)) {
      where.clientId = clientId;
    }
    if (assignedToId && ["THREESC_ADMIN", "THREESC_LEAD"].includes(role)) {
      where.assignedToId = assignedToId;
    }
    if (searchParams.get("unassigned") === "true" && ["THREESC_ADMIN", "THREESC_LEAD"].includes(role)) {
      where.assignedToId = null;
    }
    if (searchParams.get("slaAtRisk") === "true") {
      where.slaBreachRisk = true;
    }
    if (searchParams.get("slaBreached") === "true") {
      where.slaBreached = true;
    }
    if (searchParams.get("unresponded") === "true") {
      where.comments = { none: { isInternal: false } };
    }
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999`) } : {}),
      };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { ticketKey: { contains: search, mode: "insensitive" } },
      ];
    }

    const ticketSelect = {
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
    } satisfies Prisma.IssueSelect;

    const [rawTickets, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        select: ticketSelect,
        skip: isPaginated ? (page - 1) * pageSize : 0,
        take: isPaginated ? pageSize : 200,
      }),
      isPaginated ? prisma.issue.count({ where }) : Promise.resolve(undefined),
    ]);

    const tickets = rawTickets.map(({ _count, ...t }) => ({
      ...t,
      hasResponse: _count.comments > 0,
    }));

    const response = NextResponse.json({
      tickets,
      ...(isPaginated && total !== undefined
        ? {
            pagination: {
              page,
              pageSize,
              total,
              totalPages: Math.max(1, Math.ceil(total / pageSize)),
            },
          }
        : {}),
    });
    // Disable caching to ensure real-time updates
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  } catch (error) {
    console.error("Failed to fetch tickets:", error);
    const response = NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 },
    );
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    return response;
  }
}
