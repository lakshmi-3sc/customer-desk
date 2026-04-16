import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    let where: any = {};

    if (status) {
      where.status = status.toUpperCase();
    }

    const tickets = await prisma.issue.findMany({
      where,
      orderBy: {
        updatedAt: "desc",
      },
      take: 100,
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Failed to fetch tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 },
    );
  }
}
