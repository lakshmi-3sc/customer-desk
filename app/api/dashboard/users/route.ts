import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If user is from 3SC team, fetch all 3SC users
    if (currentUser.role.startsWith("THREESC_")) {
      const users = await prisma.user.findMany({
        where: {
          role: {
            in: ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"],
          },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
        orderBy: { name: "asc" },
      });

      return NextResponse.json(users);
    }

    // If user is from client, fetch client members
    const clientMembership = await prisma.clientMember.findFirst({
      where: { userId: currentUser.id },
      include: {
        client: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!clientMembership) {
      return NextResponse.json(
        { error: "Client membership not found" },
        { status: 404 },
      );
    }

    // Extract users from client members
    const users = clientMembership.client.members
      .map((member) => member.user)
      .filter((user) => user.isActive !== false);

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
