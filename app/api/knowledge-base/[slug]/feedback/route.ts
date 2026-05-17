import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { canAccessKnowledgeBaseArticle, getAccessUser } from "@/lib/tenant-access";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { helpful } = await request.json();
    const { slug } = await params;
    const currentUser = await getAccessUser(session);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const article = await prisma.knowledgeBase.findUnique({
      where: { id: slug },
      select: { id: true },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const allowed = await canAccessKnowledgeBaseArticle(currentUser, article.id);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.knowledgeBaseFeedback.upsert({
      where: {
        articleId_userId: {
          articleId: article.id,
          userId: currentUser.id,
        },
      },
      update: { helpful },
      create: {
        articleId: article.id,
        userId: currentUser.id,
        helpful,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[kb-feedback]", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
