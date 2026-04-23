import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export const revalidate = 0; // No caching - always fresh

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const role = currentUser.role;
    const is3SC = ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(role);

    let where: any = {};

    if (status) {
      where.status = status.toUpperCase();
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

    const tickets = await prisma.issue.findMany({
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
      },
      take: 200,
    });

    const response = NextResponse.json({ tickets });
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
