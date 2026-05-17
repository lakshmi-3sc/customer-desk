import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveTicketId } from "@/lib/resolve-ticket";
import { getAccessUser, is3SCRole, canAccessTicket } from "@/lib/tenant-access";
import { encodeSmartAssignSummary } from "@/lib/smart-assign-codec";
import type { SmartAssignSnapshot } from "@/lib/smart-assign-codec";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const currentUser = await getAccessUser(session);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!is3SCRole(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: idOrKey } = await params;
    const id = await resolveTicketId(idOrKey);
    if (!id || !(await canAccessTicket(currentUser, id))) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const snapshot = (await request.json()) as SmartAssignSnapshot;
    if (!snapshot?.best?.id || !Array.isArray(snapshot.agents)) {
      return NextResponse.json({ error: "Invalid smart assign snapshot" }, { status: 400 });
    }

    const ticket = await prisma.issue.findUnique({
      where: { id },
      select: { aiSummary: true, assignedToId: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const updated = await prisma.issue.update({
      where: { id },
      data: {
        aiSuggestedAgent: snapshot.best.id,
        aiSummary: encodeSmartAssignSummary(ticket.aiSummary, snapshot),
        ...(ticket.assignedToId ? {} : { assignedToId: snapshot.best.id }),
      },
      select: {
        aiSummary: true,
        aiSuggestedAgent: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, ticket: updated });
  } catch (error) {
    console.error("[smart-assign-cache]", error);
    return NextResponse.json({ error: "Failed to cache smart assign" }, { status: 500 });
  }
}
