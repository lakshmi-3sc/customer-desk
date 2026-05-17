import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { canAccessKnowledgeBaseArticle, getAccessUser } from "@/lib/tenant-access";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const currentUser = await getAccessUser(session);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const allowed = await canAccessKnowledgeBaseArticle(currentUser, slug);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const article = await prisma.knowledgeBase.findUnique({
      where: { id: slug },
      include: {
        createdBy: { select: { name: true, id: true } },
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("Get article error:", error);
    return NextResponse.json({ error: "Failed to fetch article" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    // Only 3SC admin can edit articles
    if (session?.user?.role !== "THREESC_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { slug } = await params;
    const body = await request.json();
    const { title, content, category } = body;

    const existingArticle = await prisma.knowledgeBase.findUnique({
      where: { id: slug },
      select: { id: true },
    });

    if (!existingArticle) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const article = await prisma.knowledgeBase.update({
      where: { id: existingArticle.id },
      data: {
        title: title || undefined,
        content: content || undefined,
        category: category || undefined,
        updatedAt: new Date(),
      },
      include: { createdBy: { select: { name: true } } },
    });

    return NextResponse.json({ article });
  } catch (error) {
    console.error("Update article error:", error);
    return NextResponse.json({ error: "Failed to update article" }, { status: 500 });
  }
}
