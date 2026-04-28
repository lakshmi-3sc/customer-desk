import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { resolveTicketId } from "@/lib/resolve-ticket";
import { getMentionableUsers } from "@/lib/notifications";

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

    // Get mentionable users for the current user and ticket
    const users = await getMentionableUsers(session.user.id, id);

    // Filter out the current user and format response
    const mentionableUsers = users
      .filter((u) => u.id !== session.user.id)
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
