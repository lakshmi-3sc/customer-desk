-- Add conversationSummary column to Issue table if it doesn't exist
ALTER TABLE "Issue" ADD COLUMN "conversationSummary" TEXT;
