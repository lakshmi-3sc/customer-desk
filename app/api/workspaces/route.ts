import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let workspaces;

    if (currentUser.role.startsWith("THREESC_")) {
      workspaces = await prisma.client.findMany({
        select: {
          id: true,
          name: true,
          logoUrl: true,
          industry: true,
        },
        where: {
          isActive: true,
        },
      });
    } else {
      const clientMembers = await prisma.clientMember.findMany({
        where: { userId: currentUser.id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              industry: true,
              isActive: true,
            },
          },
        },
      });

      workspaces = clientMembers
        .filter((cm) => cm.client.isActive)
        .map((cm) => cm.client);
    }

    const withColors = workspaces.map((workspace: any) => ({
      ...workspace,
      primaryColor: getPrimaryColorByIndustry(workspace.industry),
    }));

    return NextResponse.json({ workspaces: withColors });
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 });
  }
}

function getPrimaryColorByIndustry(industry: string | null): string {
  const colorMap: Record<string, string> = {
    technology: "#2563eb",
    healthcare: "#dc2626",
    finance: "#1e40af",
    retail: "#ea580c",
    manufacturing: "#7c3aed",
    education: "#0891b2",
    real_estate: "#84cc16",
    default: "#0747A6",
  };

  if (industry) {
    const key = industry.toLowerCase().replace(/\s+/g, "_");
    return colorMap[key] || colorMap.default;
  }

  return colorMap.default;
}
