/*
  Warnings:

  - A unique constraint covering the columns `[ticketKey]` on the table `Issue` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "ticketKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Issue_ticketKey_key" ON "Issue"("ticketKey");
