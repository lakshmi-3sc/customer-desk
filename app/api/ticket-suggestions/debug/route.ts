import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const query = "production";

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" });
    }

    const userId = (session.user as any).id;
    const clientId = (session.user as any).clientId;
    const role = (session.user as any).role;

    // Check user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true }
    });

    // Get all resolved tickets for this clientId
    const ticketsForClient = await prisma.issue.findMany({
      where: {
        clientId: clientId,
        status: "RESOLVED"
      },
      select: { id: true, title: true, clientId: true },
      take: 5
    });

    // Get all KB articles
    const allArticles = await prisma.knowledgeBase.findMany({
      where: { isPublished: true },
      select: { id: true, title: true, clientId: true },
      take: 5
    });

    // Test search query
    const queryLower = query.toLowerCase();
    const searchResults = await prisma.$queryRaw`
      SELECT id, title, "clientId" FROM "Issue"
      WHERE "clientId" = ${clientId}
      AND status = 'RESOLVED'
      AND LOWER(title) LIKE ${`%${queryLower}%`}
      LIMIT 5
    `;

    return NextResponse.json({
      session: {
        userId,
        clientId,
        role,
        userEmail: user?.email
      },
      ticketsForClient,
      allArticles,
      searchResults,
      totalResolvedTickets: await prisma.issue.count({
        where: { clientId, status: "RESOLVED" }
      }),
      totalArticles: await prisma.knowledgeBase.count({
        where: { isPublished: true }
      })
    });
  } catch (error) {
    console.error("[debug]", error);
    return NextResponse.json({ error: (error as any).message });
  }
}
