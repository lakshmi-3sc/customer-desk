import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get("issueId") ?? undefined;

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

    // Get the client this user belongs to (if client-side)
    let clientId: string | undefined;
    if (!currentUser.role.startsWith("THREESC_")) {
      const membership = await prisma.clientMember.findFirst({
        where: { userId: currentUser.id },
      });
      if (membership) clientId = membership.clientId;
    }

    // Fetch last 20 IssueHistory entries — filtered by issueId if provided
    const history = await prisma.issueHistory.findMany({
      where: issueId
        ? { issueId }
        : clientId
          ? { issue: { clientId } }
          : undefined,
      orderBy: { createdAt: "desc" },
      take: issueId ? 50 : 10,
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

    return NextResponse.json({ activity: history });
  } catch (error) {
    console.error("Activity API error:", error);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
