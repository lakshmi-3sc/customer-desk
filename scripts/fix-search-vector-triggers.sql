BEGIN;

CREATE OR REPLACE FUNCTION issue_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS issue_search_vector_trigger ON "Issue";
CREATE TRIGGER issue_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Issue"
  FOR EACH ROW EXECUTE FUNCTION issue_search_vector_trigger();

CREATE OR REPLACE FUNCTION kb_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kb_search_vector_trigger ON "KnowledgeBase";
CREATE TRIGGER kb_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "KnowledgeBase"
  FOR EACH ROW EXECUTE FUNCTION kb_search_vector_trigger();

COMMIT;
