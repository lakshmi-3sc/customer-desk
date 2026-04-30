import { prisma } from "@/lib/prisma";

async function setupFTS() {
  console.log("Setting up Full-Text Search...\n");

  try {
    // 1. Add search_vector columns
    console.log("1. Adding search_vector columns...");
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS search_vector tsvector`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "KnowledgeBase" ADD COLUMN IF NOT EXISTS search_vector tsvector`
    );
    console.log("   ✓ Columns added\n");

    // 2. Create GIN indexes
    console.log("2. Creating search indexes...");
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS issue_search_idx ON "Issue" USING GIN (search_vector)`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS kb_search_idx ON "KnowledgeBase" USING GIN (search_vector)`
    );
    console.log("   ✓ Indexes created\n");

    // 3. Populate Issue records
    console.log("3. Populating Issue search vectors...");
    await prisma.$executeRawUnsafe(`
      UPDATE "Issue" SET search_vector =
        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'B')
    `);
    console.log("   ✓ Issue records updated\n");

    // 4. Populate KnowledgeBase records
    console.log("4. Populating KnowledgeBase search vectors...");
    await prisma.$executeRawUnsafe(`
      UPDATE "KnowledgeBase" SET search_vector =
        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(content, '')), 'B')
    `);
    console.log("   ✓ KnowledgeBase records updated\n");

    // 5. Create Issue trigger function
    console.log("5. Creating triggers...");
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION issue_search_vector_trigger() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
                            setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // 6. Create Issue trigger
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS issue_search_vector_trigger ON "Issue"
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER issue_search_vector_trigger BEFORE INSERT OR UPDATE ON "Issue"
        FOR EACH ROW EXECUTE FUNCTION issue_search_vector_trigger()
    `);

    // 7. Create KnowledgeBase trigger function
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION kb_search_vector_trigger() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
                            setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // 8. Create KnowledgeBase trigger
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS kb_search_vector_trigger ON "KnowledgeBase"
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER kb_search_vector_trigger BEFORE INSERT OR UPDATE ON "KnowledgeBase"
        FOR EACH ROW EXECUTE FUNCTION kb_search_vector_trigger()
    `);

    console.log("   ✓ Triggers created\n");

    console.log("✅ FTS setup complete!");
    console.log("\nNow the search will work properly:");
    console.log("- Full-text indexes created for fast search");
    console.log("- All existing records indexed");
    console.log("- New records will be auto-indexed on insert/update");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up FTS:", error);
    process.exit(1);
  }
}

setupFTS();
