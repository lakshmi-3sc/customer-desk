import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { resolveTicketId } from "@/lib/resolve-ticket";
import { getMentionableUsers } from "@/lib/notifications";
import { canAccessTicket, getAccessUser } from "@/lib/tenant-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idOrKey } = await params;
    const id = await resolveTicketId(idOrKey);
    if (!id) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const currentUser = await getAccessUser(session);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const allowed = await canAccessTicket(currentUser, id);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get mentionable users for the current user and ticket
    const users = await getMentionableUsers(currentUser.id, id);

    // Filter out the current user and format response
    const mentionableUsers = users
      .filter((u) => u.id !== currentUser.id)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      }));

    return NextResponse.json({ users: mentionableUsers });
  } catch (error) {
    console.error("Error fetching mentionable users:", error);
    return NextResponse.json(
      { error: "Failed to fetch mentionable users" },
      { status: 500 },
    );
  }
}
