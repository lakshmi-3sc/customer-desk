-- CreateTable SimilarResolution (only this table is missing)
CREATE TABLE IF NOT EXISTS "SimilarResolution" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "similarResolvedId" TEXT NOT NULL,
    "similarityScore" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimilarResolution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SimilarResolution_issueId_similarResolvedId_key" ON "SimilarResolution"("issueId", "similarResolvedId");
CREATE INDEX IF NOT EXISTS "SimilarResolution_issueId_idx" ON "SimilarResolution"("issueId");
CREATE INDEX IF NOT EXISTS "SimilarResolution_similarResolvedId_idx" ON "SimilarResolution"("similarResolvedId");

-- AddForeignKey
ALTER TABLE "SimilarResolution" ADD CONSTRAINT "SimilarResolution_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimilarResolution" ADD CONSTRAINT "SimilarResolution_similarResolvedId_fkey" FOREIGN KEY ("similarResolvedId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
