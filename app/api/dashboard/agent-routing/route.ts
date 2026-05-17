import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { computeSmartAssign } from "@/lib/smart-assign";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  const allowed = ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"];
  if (!role || !allowed.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const title = searchParams.get("title") ?? "";

  try {
    return NextResponse.json(await computeSmartAssign(category, priority, title));
  } catch (err) {
    console.error("[agent-routing]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
