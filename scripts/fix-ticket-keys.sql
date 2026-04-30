-- Fix ticket keys directly in database
-- This assigns proper keys to tickets with null ticketKey

UPDATE "Issue" 
SET "ticketKey" = CASE 
  WHEN "projectId" IS NOT NULL THEN 
    -- Project-based key
    CONCAT(
      SUBSTRING(COALESCE((SELECT "name" FROM "Project" WHERE id = "Issue"."projectId"), 'TKT'), 1, 4),
      '-',
      1000 + ROW_NUMBER() OVER (PARTITION BY "projectId" ORDER BY "createdAt" ASC)
    )
  ELSE 
    -- Generic key
    CONCAT('TKT-', 1000 + ROW_NUMBER() OVER (ORDER BY "createdAt" ASC))
END
WHERE "ticketKey" IS NULL;
