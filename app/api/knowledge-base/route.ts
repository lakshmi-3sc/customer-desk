import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.toLowerCase() ?? "";
    const category = searchParams.get("category") ?? "";
    const slug = searchParams.get("slug") ?? "";
    const session = await getServerSession(authOptions);

    // Get published articles only
    const where: Prisma.KnowledgeBaseWhereInput = { isPublished: true };

    const role = session?.user?.role || "";
    const is3SCTeam = ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(role);
    const isClient = role.startsWith("CLIENT");

    // Clients can't see internal articles
    if (isClient) {
      where.isInternal = false;
      // Clients see only articles for their client or public articles
      const membership = session?.user?.id
        ? await prisma.clientMember.findFirst({
          where: { userId: session.user.id },
          select: { clientId: true },
        })
        : null;

      if (membership?.clientId) {
        where.OR = [
          { clientId: null },
          { clientId: membership.clientId },
        ];
      }
    }
    // 3SC team sees all articles (both internal and regular)
    // No additional filtering needed

    if (slug) {
      const article = await prisma.knowledgeBase.findFirst({
        where: { ...where, slug },
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

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 100);

    const article = await prisma.knowledgeBase.create({
      data: {
        title,
        slug: slug + "-" + Date.now(), // Ensure uniqueness
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
