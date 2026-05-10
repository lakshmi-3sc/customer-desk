-- AddColumn commentId to IssueAttachment
ALTER TABLE "IssueAttachment" ADD COLUMN "commentId" TEXT;

-- AddForeignKey for commentId
ALTER TABLE "IssueAttachment" ADD CONSTRAINT "IssueAttachment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
