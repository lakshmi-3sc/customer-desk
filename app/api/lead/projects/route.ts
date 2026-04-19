import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "THREESC_LEAD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true } },
      milestones: { orderBy: { dueDate: "asc" } },
      _count: { select: { issues: true } },
      issues: {
        where: { status: { notIn: ["RESOLVED", "CLOSED"] } },
        select: { id: true, priority: true, status: true },
      },
    },
  });

  return NextResponse.json({ projects });
}
