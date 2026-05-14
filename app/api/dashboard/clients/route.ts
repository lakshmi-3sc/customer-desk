import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role.startsWith("THREESC_")) {
      const clients = await prisma.client.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      return NextResponse.json({ clients });
    }

    const memberships = await prisma.clientMember.findMany({
      where: { userId: user.id },
      select: {
        client: {
          select: { id: true, name: true },
        },
      },
      orderBy: { client: { name: "asc" } },
    });

    return NextResponse.json({
      clients: memberships.map((membership) => membership.client),
    });
  } catch (error) {
    console.error("Dashboard clients API error:", error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}
