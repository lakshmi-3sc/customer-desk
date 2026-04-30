import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.toLowerCase() ?? "";
    const category = searchParams.get("category") ?? "";
    const slug = searchParams.get("slug") ?? "";
    const session = await getServerSession(authOptions);

    // Get published articles only
    let where: any = { isPublished: true };

    // Clients can't see internal articles
    if (session?.user?.role?.startsWith("CLIENT")) {
      where.isInternal = false;
      if (session.user.clientId) {
        where.OR = [
          { clientId: null },
          { clientId: session.user.clientId },
        ];
      }
    }

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

    let query: any = { ...where };

    if (category) {
      query.category = category;
    }

    if (q) {
      query.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
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
