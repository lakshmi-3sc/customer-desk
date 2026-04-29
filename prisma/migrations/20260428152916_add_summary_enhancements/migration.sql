/*
  Warnings:

  - Added `isInternal` to the `Summary` table without a default value. This will be required to populate before release.

*/
-- AlterTable
ALTER TABLE "Summary" ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN "metrics" JSONB,
ADD COLUMN "htmlContent" TEXT,
ADD COLUMN "sentToEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "sentAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ClientSummaryPreference" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "summaryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weeklyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "monthlyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailRecipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "includeResolvedIssues" BOOLEAN NOT NULL DEFAULT true,
    "includeOpenIssues" BOOLEAN NOT NULL DEFAULT true,
    "includeSLAMetrics" BOOLEAN NOT NULL DEFAULT true,
    "includeCategoryBreakdown" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientSummaryPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalSummaryPreference" (
    "id" TEXT NOT NULL,
    "summaryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weeklyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "monthlyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailRecipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "includeClientMetrics" BOOLEAN NOT NULL DEFAULT true,
    "includeAgentPerformance" BOOLEAN NOT NULL DEFAULT true,
    "includeSLAMetrics" BOOLEAN NOT NULL DEFAULT true,
    "includeEscalations" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalSummaryPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Summary_clientId_idx" ON "Summary"("clientId");

-- CreateIndex
CREATE INDEX "Summary_periodStart_periodEnd_idx" ON "Summary"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "Summary_type_idx" ON "Summary"("type");

-- CreateIndex
CREATE INDEX "Summary_isInternal_idx" ON "Summary"("isInternal");

-- CreateIndex
CREATE UNIQUE INDEX "ClientSummaryPreference_clientId_key" ON "ClientSummaryPreference"("clientId");

-- CreateIndex
CREATE INDEX "ClientSummaryPreference_clientId_idx" ON "ClientSummaryPreference"("clientId");

-- AddForeignKey
ALTER TABLE "ClientSummaryPreference" ADD CONSTRAINT "ClientSummaryPreference_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
