-- Create tsvector columns for FTS on Issue table
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create tsvector column for FTS on KnowledgeBase table
ALTER TABLE "KnowledgeBase" ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create indexes for fast FTS search
CREATE INDEX IF NOT EXISTS issue_search_idx ON "Issue" USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS kb_search_idx ON "KnowledgeBase" USING GIN (search_vector);

-- Populate existing Issue records with tsvector
UPDATE "Issue" SET search_vector = setweight(to_tsvector('english', COALESCE(title, '')), 'A') || setweight(to_tsvector('english', COALESCE(description, '')), 'B');

-- Populate existing KnowledgeBase records with tsvector
UPDATE "KnowledgeBase" SET search_vector = setweight(to_tsvector('english', COALESCE(title, '')), 'A') || setweight(to_tsvector('english', COALESCE(content, '')), 'B');

-- Create trigger for Issue to auto-update tsvector on insert/update
CREATE OR REPLACE FUNCTION issue_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') || setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS issue_search_vector_trigger ON "Issue";
CREATE TRIGGER issue_search_vector_trigger BEFORE INSERT OR UPDATE ON "Issue"
  FOR EACH ROW EXECUTE FUNCTION issue_search_vector_trigger();

-- Create trigger for KnowledgeBase to auto-update tsvector on insert/update
CREATE OR REPLACE FUNCTION kb_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') || setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kb_search_vector_trigger ON "KnowledgeBase";
CREATE TRIGGER kb_search_vector_trigger BEFORE INSERT OR UPDATE ON "KnowledgeBase"
  FOR EACH ROW EXECUTE FUNCTION kb_search_vector_trigger();
