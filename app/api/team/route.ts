import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

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

    // Find the client this user belongs to
    const membership = await prisma.clientMember.findFirst({
      where: { userId: currentUser.id },
      include: { client: true },
    });

    if (!membership) {
      return NextResponse.json({ members: [] });
    }

    const members = await prisma.clientMember.findMany({
      where: { clientId: membership.clientId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    // Count issues raised per user
    const memberData = await Promise.all(
      members.map(async (m) => {
        const issuesRaised = await prisma.issue.count({
          where: { raisedById: m.userId, clientId: membership.clientId },
        });
        return {
          id: m.userId,
          name: m.user.name,
          email: m.user.email,
          role: m.user.role,
          isActive: m.user.isActive,
          joinedAt: m.joinedAt,
          issuesRaised,
        };
      })
    );

    return NextResponse.json({ members: memberData, clientName: membership.client.name });
  } catch (error) {
    console.error("Team API error:", error);
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}
