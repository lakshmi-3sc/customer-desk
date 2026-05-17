import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

type AiConfigRow = {
  id: string;
  autoClassify: boolean;
  autoAssign: boolean;
  suggestedResponses: boolean;
  resolutionPrediction: boolean;
  resolutionCopilot: boolean;
  semanticSearch: boolean;
  confidenceThreshold: number;
  similarityThreshold: number;
  autoApplyThreshold: number;
  manualReviewThreshold: number;
  routingRules: unknown;
  updatedById: string | null;
  updatedByName: string | null;
  updatedByEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const DEFAULT_CONFIG = {
  id: "global",
  autoClassify: true,
  autoAssign: true,
  suggestedResponses: true,
  resolutionPrediction: true,
  resolutionCopilot: true,
  semanticSearch: true,
  confidenceThreshold: 70,
  similarityThreshold: 60,
  autoApplyThreshold: 80,
  manualReviewThreshold: 60,
  routingRules: [
    { id: 1, category: "BUG", skill: "Technical Support", confidence: 88, agent: "Auto-assign" },
    { id: 2, category: "BILLING", skill: "Billing & Accounts", confidence: 92, agent: "Auto-assign" },
    { id: 3, category: "FEATURE_REQUEST", skill: "Product Feedback", confidence: 79, agent: "Route to Lead" },
    { id: 4, category: "DELIVERY", skill: "Logistics Support", confidence: 95, agent: "Auto-assign" },
    { id: 5, category: "GENERAL", skill: "General Helpdesk", confidence: 85, agent: "Auto-assign" },
    { id: 6, category: "TECHNICAL", skill: "Technical Support", confidence: 90, agent: "Auto-assign" },
  ],
  updatedById: null,
  updatedByName: null,
  updatedByEmail: null,
  createdAt: null,
  updatedAt: null,
};

function requireAdmin(session: unknown) {
  return (session as { user?: { role?: string | null } } | null)?.user?.role === "THREESC_ADMIN";
}

function asBool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function clampInt(value: unknown, fallback: number, min = 0, max = 100) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function isMissingAiConfigTable(error: unknown) {
  const candidate = error as { code?: string; meta?: { code?: string } } | null;
  return candidate?.code === "P2010" && candidate.meta?.code === "42P01";
}

async function readConfig() {
  const rows = await prisma.$queryRaw<AiConfigRow[]>(Prisma.sql`
    SELECT
      ac."id",
      ac."autoClassify",
      ac."autoAssign",
      ac."suggestedResponses",
      ac."resolutionPrediction",
      ac."resolutionCopilot",
      ac."semanticSearch",
      ac."confidenceThreshold",
      ac."similarityThreshold",
      ac."autoApplyThreshold",
      ac."manualReviewThreshold",
      ac."routingRules",
      ac."updatedById",
      u."name" AS "updatedByName",
      u."email" AS "updatedByEmail",
      ac."createdAt",
      ac."updatedAt"
    FROM "AiConfig" ac
    LEFT JOIN "User" u ON u."id" = ac."updatedById"
    WHERE ac."id" = 'global'
    LIMIT 1
  `);

  return rows[0] ?? DEFAULT_CONFIG;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!requireAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await readConfig();
    return NextResponse.json({ config });
  } catch (error) {
    if (isMissingAiConfigTable(error)) {
      return NextResponse.json({ config: { ...DEFAULT_CONFIG, needsMigration: true } });
    }
    console.error("[ai-config] GET failed", error);
    return NextResponse.json({ error: "Failed to fetch AI config" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!requireAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const current = await readConfig();
    const body = await request.json();
    const next = {
      autoClassify: asBool(body.autoClassify, current.autoClassify),
      autoAssign: asBool(body.autoAssign, current.autoAssign),
      suggestedResponses: asBool(body.suggestedResponses, current.suggestedResponses),
      resolutionPrediction: asBool(body.resolutionPrediction, current.resolutionPrediction),
      resolutionCopilot: asBool(body.resolutionCopilot, current.resolutionCopilot),
      semanticSearch: asBool(body.semanticSearch, current.semanticSearch),
      confidenceThreshold: clampInt(body.confidenceThreshold, current.confidenceThreshold, 40, 95),
      similarityThreshold: clampInt(body.similarityThreshold, current.similarityThreshold, 30, 95),
      autoApplyThreshold: clampInt(body.autoApplyThreshold, current.autoApplyThreshold, 50, 95),
      manualReviewThreshold: clampInt(body.manualReviewThreshold, current.manualReviewThreshold, 20, 80),
      routingRules: Array.isArray(body.routingRules) ? body.routingRules : current.routingRules,
    };

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "AiConfig" (
        "id",
        "autoClassify",
        "autoAssign",
        "suggestedResponses",
        "resolutionPrediction",
        "resolutionCopilot",
        "semanticSearch",
        "confidenceThreshold",
        "similarityThreshold",
        "autoApplyThreshold",
        "manualReviewThreshold",
        "routingRules",
        "updatedById",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        'global',
        ${next.autoClassify},
        ${next.autoAssign},
        ${next.suggestedResponses},
        ${next.resolutionPrediction},
        ${next.resolutionCopilot},
        ${next.semanticSearch},
        ${next.confidenceThreshold},
        ${next.similarityThreshold},
        ${next.autoApplyThreshold},
        ${next.manualReviewThreshold},
        ${JSON.stringify(next.routingRules)}::jsonb,
        ${session?.user?.id ?? null},
        NOW(),
        NOW()
      )
      ON CONFLICT ("id") DO UPDATE SET
        "autoClassify" = EXCLUDED."autoClassify",
        "autoAssign" = EXCLUDED."autoAssign",
        "suggestedResponses" = EXCLUDED."suggestedResponses",
        "resolutionPrediction" = EXCLUDED."resolutionPrediction",
        "resolutionCopilot" = EXCLUDED."resolutionCopilot",
        "semanticSearch" = EXCLUDED."semanticSearch",
        "confidenceThreshold" = EXCLUDED."confidenceThreshold",
        "similarityThreshold" = EXCLUDED."similarityThreshold",
        "autoApplyThreshold" = EXCLUDED."autoApplyThreshold",
        "manualReviewThreshold" = EXCLUDED."manualReviewThreshold",
        "routingRules" = EXCLUDED."routingRules",
        "updatedById" = EXCLUDED."updatedById",
        "updatedAt" = NOW()
    `);

    const config = await readConfig();
    return NextResponse.json({ config });
  } catch (error) {
    if (isMissingAiConfigTable(error)) {
      return NextResponse.json(
        { error: "AI config table is not migrated yet" },
        { status: 409 },
      );
    }
    console.error("[ai-config] PATCH failed", error);
    return NextResponse.json({ error: "Failed to save AI config" }, { status: 500 });
  }
}
