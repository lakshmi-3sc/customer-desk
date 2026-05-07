import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

function defaultPreferences(clientId: string, email?: string | null) {
  return {
    clientId,
    summaryEnabled: true,
    weeklyEnabled: true,
    monthlyEnabled: true,
    emailRecipients: email ? [email] : [],
    includeResolvedIssues: true,
    includeOpenIssues: true,
    includeSLAMetrics: true,
    includeCategoryBreakdown: true,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { error: "Missing clientId parameter" },
        { status: 400 }
      );
    }

    // Verify user has access to this client
    const clientMember = await prisma.clientMember.findFirst({
      where: {
        clientId,
        userId: session.user.id,
      },
    });

    if (!clientMember) {
      return NextResponse.json(
        { error: "Access denied to this client" },
        { status: 403 }
      );
    }

    const preferences = defaultPreferences(clientId, session.user.email);

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { error: "Missing clientId parameter" },
        { status: 400 }
      );
    }

    // Verify user has access to this client
    const clientMember = await prisma.clientMember.findFirst({
      where: {
        clientId,
        userId: session.user.id,
      },
    });

    if (!clientMember) {
      return NextResponse.json(
        { error: "Access denied to this client" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      summaryEnabled,
      weeklyEnabled,
      monthlyEnabled,
      emailRecipients,
      includeResolvedIssues,
      includeOpenIssues,
      includeSLAMetrics,
      includeCategoryBreakdown,
    } = body;

    const preferences = {
      ...defaultPreferences(clientId, session.user.email),
      ...(summaryEnabled !== undefined && { summaryEnabled }),
      ...(weeklyEnabled !== undefined && { weeklyEnabled }),
      ...(monthlyEnabled !== undefined && { monthlyEnabled }),
      ...(Array.isArray(emailRecipients) && { emailRecipients }),
      ...(includeResolvedIssues !== undefined && { includeResolvedIssues }),
      ...(includeOpenIssues !== undefined && { includeOpenIssues }),
      ...(includeSLAMetrics !== undefined && { includeSLAMetrics }),
      ...(includeCategoryBreakdown !== undefined && { includeCategoryBreakdown }),
      updatedAt: new Date(),
    };

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
