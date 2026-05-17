import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import type { Prisma } from "@prisma/client";
import { getAccessUser, is3SCRole } from "@/lib/tenant-access";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.toLowerCase() ?? "";
    const category = searchParams.get("category") ?? "";
    const slug = searchParams.get("slug") ?? "";
    const session = await getServerSession(authOptions);
    const currentUser = await getAccessUser(session);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get published articles only
    const where: Prisma.KnowledgeBaseWhereInput = { isPublished: true };

    const is3SCTeam = is3SCRole(currentUser.role);

    // Non-3SC users can't see internal articles or other clients' articles.
    if (!is3SCTeam) {
      where.isInternal = false;
      // Clients see only articles for their client or public articles
      const membership = await prisma.clientMember.findFirst({
        where: { userId: currentUser.id },
        select: { clientId: true },
      });

      if (membership?.clientId) {
        where.OR = [
          { clientId: null },
          { clientId: membership.clientId },
        ];
      } else {
        return NextResponse.json({ articles: [] });
      }
    }
    // 3SC team sees all articles (both internal and regular)
    // No additional filtering needed

    if (slug) {
      const article = await prisma.knowledgeBase.findFirst({
        where: { ...where, id: slug },
        include: { createdBy: { select: { name: true } } },
      });
      if (!article) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ article });
    }

    const query: Prisma.KnowledgeBaseWhereInput = { ...where };

    if (category) {
      query.category = category;
    }

    if (q) {
      query.AND = [
        ...(Array.isArray(query.AND) ? query.AND : query.AND ? [query.AND] : []),
        {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        },
      ];
    }

    const articles = await prisma.knowledgeBase.findMany({
      where: query,
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    });

    // Return articles with preview summary instead of full content
    const list = articles.map(({ content, ...a }) => ({
      ...a,
      summary: content.substring(0, 120).replace(/\n/g, " ").trim() + (content.length > 120 ? "..." : ""),
    }));

    return NextResponse.json({ articles: list });
  } catch (error) {
    console.error("[knowledge-base]", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only 3SC admin can create articles
    if (session?.user?.role !== "THREESC_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, category } = body;

    if (!title || !category) {
      return NextResponse.json({ error: "Title and category required" }, { status: 400 });
    }

    const article = await prisma.knowledgeBase.create({
      data: {
        title,
        content: content || "",
        category,
        isPublished: true,
        isInternal: false,
        createdById: session.user.id,
      },
      include: { createdBy: { select: { name: true } } },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error("[knowledge-base POST]", error);
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 }
    );
  }
}
