import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { helpful } = await request.json();
    const slug = params.slug;

    const article = await prisma.knowledgeBase.findFirst({
      where: { slug },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    await prisma.knowledgeBaseFeedback.upsert({
      where: {
        articleId_userId: {
          articleId: article.id,
          userId: session.user.id,
        },
      },
      update: { helpful },
      create: {
        articleId: article.id,
        userId: session.user.id,
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
