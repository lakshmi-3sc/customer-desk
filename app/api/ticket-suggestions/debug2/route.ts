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
    const role = (session.user as any).role;

    console.log("=== DEBUG SEARCH ===");
    console.log("User ID:", userId);
    console.log("Role:", role);

    // Step 1: Get user's ClientMembers
    const clientMembers = await prisma.clientMember.findMany({
      where: { userId },
      select: { clientId: true },
    });
    console.log("Client Members found:", clientMembers.length);
    console.log("Client IDs:", clientMembers.map(cm => cm.clientId));

    const userClientIds = clientMembers.map((cm) => cm.clientId);

    // Step 2: Test direct Prisma query for articles
    const articlesViaORM = await prisma.knowledgeBase.findMany({
      where: {
        isPublished: true,
      },
      select: { id: true, title: true, clientId: true },
      take: 5,
    });
    console.log("All published articles (ORM):", articlesViaORM.length);

    // Step 3: Test raw SQL search for articles
    const queryLower = query.toLowerCase();
    const articlesViaSQL = await prisma.$queryRawUnsafe(`
      SELECT id, title, "clientId", content
      FROM "KnowledgeBase"
      WHERE "isPublished" = true
      AND (
        LOWER(title) ILIKE $1
        OR LOWER(content) ILIKE $1
      )
      ORDER BY "createdAt" DESC
      LIMIT 10
    `, `%${queryLower}%`);
    console.log("Articles found via SQL search:", (articlesViaSQL as any[]).length);
    console.log("Articles:", articlesViaSQL);

    // Step 4: Test with clientId filter
    if (userClientIds.length > 0) {
      const articlesFiltered = await prisma.$queryRawUnsafe(`
        SELECT id, title, "clientId"
        FROM "KnowledgeBase"
        WHERE "isPublished" = true
        AND "isInternal" = false
        AND (
          "clientId" IS NULL
          OR "clientId" = ANY($1)
        )
        AND (
          LOWER(title) ILIKE $2
          OR LOWER(content) ILIKE $2
        )
        LIMIT 10
      `, userClientIds, `%${queryLower}%`);
      console.log("Articles with clientId filter:", (articlesFiltered as any[]).length);
    }

    // Step 5: Test tickets search
    const ticketsViaSQL = await prisma.$queryRawUnsafe(`
      SELECT id, title, "clientId", status
      FROM "Issue"
      WHERE status = 'RESOLVED'
      AND (
        LOWER(title) ILIKE $1
        OR LOWER(description) ILIKE $1
      )
      ORDER BY "resolvedAt" DESC
      LIMIT 10
    `, `%${queryLower}%`);
    console.log("Tickets found via SQL search:", (ticketsViaSQL as any[]).length);

    return NextResponse.json({
      userId,
      role,
      clientMembersCount: clientMembers.length,
      userClientIds,
      allPublishedArticles: articlesViaORM.length,
      articlesFromSQL: (articlesViaSQL as any[]).length,
      ticketsFromSQL: (ticketsViaSQL as any[]).length,
      sampleArticles: articlesViaSQL,
      sampleTickets: ticketsViaSQL,
    });
  } catch (error) {
    console.error("[debug]", error);
    return NextResponse.json({ error: (error as any).message });
  }
}
