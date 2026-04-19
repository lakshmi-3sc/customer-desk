import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const category = req.nextUrl.searchParams.get("category") ?? "";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "20"), 50);

  const issues = await prisma.issue.findMany({
    where: {
      status: { in: ["RESOLVED", "CLOSED"] },
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { ticketKey: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { resolvedAt: "desc" },
    take: limit,
    select: {
      id: true,
      ticketKey: true,
      title: true,
      description: true,
      category: true,
      priority: true,
      resolvedAt: true,
      client: { select: { name: true } },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json({ issues });
}
