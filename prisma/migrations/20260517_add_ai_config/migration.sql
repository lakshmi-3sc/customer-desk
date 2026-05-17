CREATE TABLE "AiConfig" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "autoClassify" BOOLEAN NOT NULL DEFAULT true,
  "autoAssign" BOOLEAN NOT NULL DEFAULT true,
  "suggestedResponses" BOOLEAN NOT NULL DEFAULT true,
  "resolutionPrediction" BOOLEAN NOT NULL DEFAULT true,
  "resolutionCopilot" BOOLEAN NOT NULL DEFAULT true,
  "semanticSearch" BOOLEAN NOT NULL DEFAULT true,
  "confidenceThreshold" INTEGER NOT NULL DEFAULT 70,
  "similarityThreshold" INTEGER NOT NULL DEFAULT 60,
  "autoApplyThreshold" INTEGER NOT NULL DEFAULT 80,
  "manualReviewThreshold" INTEGER NOT NULL DEFAULT 60,
  "routingRules" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiConfig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiConfig_updatedById_idx" ON "AiConfig"("updatedById");

ALTER TABLE "AiConfig"
ADD CONSTRAINT "AiConfig_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
