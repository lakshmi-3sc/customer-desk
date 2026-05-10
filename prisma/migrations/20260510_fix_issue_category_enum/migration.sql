-- Create new enum with correct values
CREATE TYPE "IssueCategory_new" AS ENUM ('BUG', 'FEATURE_REQUEST', 'DATA_ACCURACY', 'PERFORMANCE', 'ACCESS_SECURITY');

-- Drop default constraint from category column
ALTER TABLE "Issue" ALTER COLUMN "category" DROP DEFAULT;

-- Alter Issue table column to use new enum (mapping old values to BUG as default)
ALTER TABLE "Issue" ALTER COLUMN "category" TYPE "IssueCategory_new" USING (
  CASE
    WHEN category::text IN ('DELIVERY', 'BILLING', 'GENERAL', 'TECHNICAL') THEN 'BUG'::"IssueCategory_new"
    ELSE category::text::"IssueCategory_new"
  END
);

-- Set default back to BUG
ALTER TABLE "Issue" ALTER COLUMN "category" SET DEFAULT 'BUG'::"IssueCategory_new";

-- Drop old enum
DROP TYPE "IssueCategory";

-- Rename new enum to original name
ALTER TYPE "IssueCategory_new" RENAME TO "IssueCategory";
