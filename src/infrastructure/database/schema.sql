-- Database schema. Safe to run any number of times (every statement is IF NOT EXISTS).
-- Limitation: IF NOT EXISTS never *changes* an existing table. After editing a
-- column here, reset local data with `docker compose down -v` (see DECISIONS D12).

-- pgvector adds the `vector` type and distance operators (<=> = cosine distance).
-- Pinned to schema "public" so it is installed once per database, even when the
-- integration tests run this file inside their own temporary schema.
CREATE EXTENSION IF NOT EXISTS vector SCHEMA public;

CREATE TABLE IF NOT EXISTS chunks (
  -- Readable and deterministic, e.g. "co-iec:art-335c:0" (document : article : part).
  -- Same input -> same id, and short enough for the model to cite reliably.
  id         TEXT PRIMARY KEY,
  document   TEXT NOT NULL,          -- source file name without extension
  section    TEXT NOT NULL,          -- heading path, e.g. "G. End of ... > 2. Notice periods > c. After ..."
  article    TEXT NOT NULL,          -- e.g. "Art. 335c"
  position   INT  NOT NULL,          -- order of the chunk within its document
  text       TEXT NOT NULL,          -- exact law text: citations are validated against this verbatim
  embedding  vector(384) NOT NULL,   -- MiniLM output (384 numbers), built from section + article + text

  -- Keyword search column, computed by Postgres itself and kept in sync automatically.
  -- 'english' config: lowercases, drops stop words ("the", "of"), and stems
  -- ("terminated" -> "termin"), so "termination" also matches "terminated".
  -- Includes section + article so a search for "probation period" finds chunks under that heading.
  tsv tsvector GENERATED ALWAYS AS (
    to_tsvector('english', section || ' ' || article || ' ' || text)
  ) STORED,

  UNIQUE (document, position)
);

-- HNSW = approximate nearest-neighbour graph index for fast vector search.
-- vector_cosine_ops must match the operator used in queries (<=>), or the index is ignored.
CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw
  ON chunks USING hnsw (embedding vector_cosine_ops);

-- GIN = inverted index (word -> rows), the standard index for full-text search.
CREATE INDEX IF NOT EXISTS chunks_tsv_gin
  ON chunks USING gin (tsv);
