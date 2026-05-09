import { NextRequest, NextResponse } from "next/server";
import { runEscalationEngine } from "@/lib/escalation";

// Called by Vercel Cron every 15 minutes
// Also callable manually with the CRON_SECRET header for testing
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runEscalationEngine();
    console.log(`[cron/escalate] Escalated ${results.length} ticket(s):`, results.map(r => r.ticketKey ?? r.issueId));
    return NextResponse.json({
      success: true,
      escalated: results.length,
      tickets: results.map(r => ({ ticketKey: r.ticketKey, rule: r.rule })),
    });
  } catch (err) {
    console.error("[cron/escalate] Error:", err);
    return NextResponse.json({ error: "Escalation engine failed" }, { status: 500 });
  }
}
