import { NextResponse } from "next/server";

// Cron endpoint - REMOVED for now
// Focus on real-time dashboard summary instead of pre-generated summaries
export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Cron summaries removed - using real-time calculation"
  });
}
