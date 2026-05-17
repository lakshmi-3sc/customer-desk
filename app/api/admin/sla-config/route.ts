import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { IssuePriority } from "@prisma/client";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SLA_DEFAULTS } from "@/lib/sla";

const PRIORITY_META: Record<IssuePriority, { id: number; label: string; breachAction: string; color: string }> = {
  CRITICAL: {
    id: 1,
    label: "Critical",
    breachAction: "Escalate + SMS alert",
    color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  HIGH: {
    id: 2,
    label: "High",
    breachAction: "Escalate to Lead",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
  MEDIUM: {
    id: 3,
    label: "Medium",
    breachAction: "Email notification",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  LOW: {
    id: 4,
    label: "Low",
    breachAction: "Log only",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
};

const PRIORITIES: IssuePriority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function isAdmin(session: unknown) {
  return (session as { user?: { role?: string | null } } | null)?.user?.role === "THREESC_ADMIN";
}

function clampHours(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(720, Math.max(1, Math.round(value)));
}

async function readPolicies() {
  const policies = await prisma.slaPolicy.findMany({
    select: { priority: true, responseTime: true, resolutionTime: true, updatedAt: true },
  });
  const policyMap = new Map(policies.map((policy) => [policy.priority, policy]));
  const latestUpdatedAt = policies.reduce<Date | null>((latest, policy) => {
    if (!latest || policy.updatedAt > latest) return policy.updatedAt;
    return latest;
  }, null);

  return {
    tiers: PRIORITIES.map((priority) => {
      const policy = policyMap.get(priority);
      const fallback = SLA_DEFAULTS[priority];
      const meta = PRIORITY_META[priority];
      return {
        ...meta,
        priority,
        responseHrs: policy?.responseTime ?? fallback.responseTime,
        resolutionHrs: policy?.resolutionTime ?? fallback.resolutionTime,
        source: policy ? "database" : "default",
      };
    }),
    updatedAt: latestUpdatedAt,
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await readPolicies();
    return NextResponse.json({ config });
  } catch (error) {
    console.error("[sla-config] GET failed", error);
    return NextResponse.json({ error: "Failed to fetch SLA config" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const incoming = Array.isArray(body.tiers) ? body.tiers : [];

    const writes = PRIORITIES.map((priority) => {
      const match = incoming.find((tier: { priority?: string }) => tier.priority === priority);
      const fallback = SLA_DEFAULTS[priority];
      return prisma.slaPolicy.upsert({
        where: { priority },
        create: {
          priority,
          responseTime: clampHours(match?.responseHrs, fallback.responseTime),
          resolutionTime: clampHours(match?.resolutionHrs, fallback.resolutionTime),
        },
        update: {
          responseTime: clampHours(match?.responseHrs, fallback.responseTime),
          resolutionTime: clampHours(match?.resolutionHrs, fallback.resolutionTime),
        },
      });
    });

    await prisma.$transaction(writes);
    const config = await readPolicies();

    return NextResponse.json({ config });
  } catch (error) {
    console.error("[sla-config] PATCH failed", error);
    return NextResponse.json({ error: "Failed to save SLA config" }, { status: 500 });
  }
}
