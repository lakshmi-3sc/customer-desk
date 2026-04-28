import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If client user, get their client's projects
    if (user.role === "CLIENT_ADMIN" || user.role === "CLIENT_USER") {
      // Get client member relationship
      const clientMember = await prisma.clientMember.findFirst({
        where: { userId: user.id },
        include: { client: true },
      });

      if (!clientMember) {
        return NextResponse.json({ projects: [] });
      }

      const projects = await prisma.project.findMany({
        where: {
          clientId: clientMember.clientId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          clientId: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ projects });
    }

    // For 3SC team, return all projects from all clients
    const projects = await prisma.project.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        clientId: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}
