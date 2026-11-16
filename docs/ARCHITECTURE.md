# Architecture

> **Status: Phase 2 built** (setup, ingestion, and retrieval: vector, keyword and hybrid search, `npm run search`). Each section is updated as its phase is built; anything not built yet is marked _(planned)_.

## 1. What the system does

A question-answering service over a small, fixed set of public documents (Swiss employment-contract law). For each question it:

1. **retrieves** the most relevant passages from PostgreSQL,
2. asks a language model to answer **only from those passages**, citing them by id with a verbatim quote,
3. **checks in code** that every quote really appears in the cited passage,
4. **refuses** when the passages do not support an answer.

A separate evaluation suite measures how well retrieval, citation and refusal work, and CI fails if retrieval quality regresses.

## 2. Components

```mermaid
flowchart LR
    subgraph Ingestion["Ingestion (offline, npm run ingest)"]
        L[Loader] --> C[Chunker] --> E[Embedder<br/>MiniLM, local]
    end

    subgraph DB["PostgreSQL 16 + pgvector"]
        T[(chunks<br/>embedding vector 384<br/>tsv tsvector)]
    end

    subgraph Ask["Answering (online, POST /ask or CLI)"]
        R[Retriever<br/>vector / keyword / hybrid RRF]
        P[Prompt builder]
        M[LlmClient<br/>OpenAI-compatible]
        V[Citation validator]
        R --> P --> M --> V
    end

    subgraph Eval["Evaluation (npm run eval)"]
        Q[eval/questions.jsonl] --> X[Metrics<br/>hit@5, MRR, faithfulness,<br/>citation validity, refusal accuracy]
    end

    E --> T
    T --> R
    M <--> O[Ollama<br/>local open-weight model]
    X --> R
    X --> Ask
```

| Component | Responsibility | Phase |
|---|---|---|
| Corpus build script | Download the pinned fedlex HTML, keep Art. 319–343, write `corpus/*.txt` | 0 ✅ |
| Env validation | Read `.env`, validate once at startup, crash early with all problems listed | 0 ✅ |
| `DatabaseModule` | One shared `pg` pool (2 s connect timeout), closed on shutdown | 0 ✅ |
| `GET /health` | `SELECT 1` through the pool: 200 if the database is up, 503 if not | 0 ✅ |
| Loader + parser | Read `corpus/*.txt` (not `.md`), split into articles with their heading path | 1 ✅ |
| Chunker | Pure function: one article per chunk if it fits, else paragraphs → items → sentences, short-paragraph overlap; ≤ 250 model tokens (D7) | 1 ✅ |
| `Embedder` (interface) + `MiniLmEmbedder` | `countTokens()` with the model's tokenizer; `embed()` → 384-dim unit vectors, batches of 32 | 1 ✅ |
| `ChunkStore` (interface) + `ChunksRepository` | Write-side SQL; `replaceDocument()` in one transaction (D14) | 1 ✅ |
| `IngestionService` + `npm run ingest` | load → parse → chunk → embed → store, per document; prints a report | 1 ✅ |
| `ChunkSearch` (interface) + `ChunksSearchRepository` | Read-side SQL: vector (`<=>`) and keyword (OR + `ts_rank`) queries, optional document filter (D17, D19, D20) | 2 ✅ |
| `reciprocalRankFusion` | Pure function, ~20 lines: `Σ 1/(60 + rank)`, deterministic ties (D18) | 2 ✅ |
| `Retriever` (interface) + Vector / Keyword / Hybrid retrievers | Same call for all three; `RETRIEVERS` registry to pick or loop by name | 2 ✅ |
| `npm run search` | CLI: show one or all three retrievers' top-k for a question | 2 ✅ |
| Prompt builder | Number the passages and state the answering rules | 3 _(planned)_ |
| `LlmClient` | Call the model over an OpenAI-compatible HTTP API; retry once | 3 _(planned)_ |
| Citation validator | Deterministic check that each quote is verbatim in its chunk | 3 _(planned)_ |
| Refusal policy | Refuse on low retrieval score or model-reported insufficiency | 3 _(planned)_ |
| Eval runner | Compute metrics and write results files | 4 _(planned)_ |

### 2.1 Code layout (D10)

```
src/
  main.ts                          HTTP bootstrap: create app, shutdown hooks, listen on PORT
  app.module.ts                    HTTP root module: config + database + controllers
  cli/                             command-line entry points (Nest without a web server)
    ingest.ts                      `npm run ingest`
    search.ts                      `npm run search` (+ parse-search-args, format-hits)
  health/health.controller.ts      GET /health
  ingestion/                       BUSINESS LOGIC
    load-documents.ts              corpus/*.txt -> SourceDocument[]
    parse-corpus-text.ts           text -> ParsedArticle[]
    chunker.ts                     articles -> Chunk[]  (+ split-oversized, chunk-id, embedding-text)
    embed-chunks.ts                batches of 32 -> EmbeddedChunk[]
    ingestion.service.ts           the pipeline
    embedder.ts, chunk-store.ts    INTERFACES (+ EMBEDDER, CHUNK_STORE tokens)
  infrastructure/                  TALKS TO THE OUTSIDE WORLD
    config/                        env validation, AppConfigModule (shared by HTTP + CLI)
    database/                      pool, schema.sql, apply-schema, ChunksRepository (write),
                                   ChunksSearchRepository (read)
    embeddings/                    MiniLmEmbedder, EmbeddingsModule
  retrieval/                       BUSINESS LOGIC
    retriever.ts                   INTERFACE Retriever + RETRIEVERS registry
    chunk-search.ts                INTERFACE ChunkSearch (+ CHUNK_SEARCH token)
    vector / keyword / hybrid .retriever.ts
    rrf.ts                         reciprocal rank fusion
    retrieval.config.ts            DEFAULT_TOP_K = 5, HYBRID_CANDIDATES = 20 (provisional)
  answering/                       (planned)
test/                              integration tests (*.int-spec.ts) + helpers
scripts/corpus/                    build-corpus.ts -> download / parse-articles / render-text
corpus/                            co-individual-employment-contract.txt, SOURCES.md
```

Rule: business code depends on interfaces; `infrastructure/` implements them; Nest's dependency injection connects them. Example: `IngestionService` asks for `EMBEDDER` and `CHUNK_STORE`; `EmbeddingsModule` binds `EMBEDDER` to `MiniLmEmbedder`, `DatabaseModule` binds `CHUNK_STORE` to `ChunksRepository`. Unit tests use the business code with fakes (e.g. a word counter instead of the tokenizer).

### 2.2 Startup sequence (built)

```
main.ts → NestFactory.create(AppModule)
  → ConfigModule loads .env → validateEnv() → throws listing every invalid variable
  → DatabaseModule builds one pg Pool from DATABASE_URL
  → HealthController receives the pool via @Inject(PG_POOL)
  → app.listen(PORT)
SIGTERM / Ctrl+C → enableShutdownHooks → DatabaseModule.onApplicationShutdown → pool.end()
```

### 2.3 Corpus format (built)

```
## G. End of the employment relationship > II. Open-ended employment relationship > 2. Notice periods > c. After the probation period
### Art. 335c
1 The employment relationship may be terminated at one month's notice ...
2 These notice periods may be varied ...
```

`##` = heading path (becomes the chunk's `section`), `###` = one article (natural chunk boundary), numbered lines = paragraphs, indented lines = list items. Provenance and reuse terms: `corpus/SOURCES.md`.

## 3. Data flows

### 3.1 Ingestion (built)

```
npm run ingest  (build, then node dist/cli/ingest.js)
  → Nest application context (DI, no web server), MiniLM loaded once at startup
  → applySchema()                       table + indexes, IF NOT EXISTS (D12)
  → for each corpus/*.txt:
      parseCorpusText → chunkDocument(countTokens = MiniLM tokenizer)
      → embedChunks: embed "section + article + text" (D13), batches of 32
      → ChunksRepository.replaceDocument:
          BEGIN → DELETE document's chunks → INSERT all → COMMIT   (ROLLBACK on error)
  → report table (articles, chunks, largest chunk in tokens) → close pool
```

Measured on the current corpus: 91 articles → 99 chunks, largest 234 tokens, ≈2 s after the model is loaded.
Ingestion is **idempotent**: ids are deterministic (D16) and each document is replaced as a whole (D14), so a re-run leaves exactly the same rows — verified by an integration test.

### 3.2 Retrieval (built)

```
retrieve(question, { limit, document? })
  vector  → embed question with the SAME model as the chunks → ORDER BY embedding <=> q   score = 1 - cosine distance
  keyword → plainto_tsquery, & replaced by | (OR) → tsv @@ query → ORDER BY ts_rank          score = ts_rank
  hybrid  → vector + keyword in parallel, max(20, limit) each → RRF Σ 1/(60 + rank) → top limit   score = RRF
```

Scores are only comparable within one mode. All SQL values are bound parameters. `npm run search -- "<question>" --mode all` prints the three side by side; quality is measured in Phase 4, not judged from single questions (see the observation recorded in D18).

### 3.3 Answering a question _(planned)_

```
POST /ask { question }
  → embed question
  → retrieve top-k (hybrid by default)
  → best score below threshold?  → refuse (no model call)
  → build prompt with numbered passages
  → model returns JSON { answer, citations[], refused }
  → validate JSON shape (retry once if malformed)
  → validate each citation verbatim against its chunk
  → response: answer + citations (each marked valid/invalid) + refused flag
```

Rule: an answer with no valid citation is never returned as a factual answer.

### 3.4 Evaluation _(planned)_

```
eval/questions.jsonl
  → for each retriever: hit@5, MRR against gold chunks       (no model needed — runs in CI)
  → full /ask pipeline: citation validity, refusal accuracy,
    faithfulness via LLM judge                                 (needs local model — run manually)
  → eval/results/*.json + summary table
```

## 4. Database schema (built)

Source of truth: `src/infrastructure/database/schema.sql` (commented line by line).

| Column | Type | Example / purpose |
|---|---|---|
| `id` | `TEXT` PK | `co-individual-employment-contract:art-335c:0` (D16) |
| `document` | `TEXT` | file name without extension |
| `section` | `TEXT` | heading path, `G. End of … > 2. Notice periods > c. After the probation period` |
| `article` | `TEXT` | `Art. 335c` |
| `position` | `INT` | order in the document; `UNIQUE (document, position)` |
| `text` | `TEXT` | exact law text — citations are validated against it |
| `embedding` | `vector(384)` | MiniLM vector of `section + article + text` |
| `tsv` | `tsvector`, generated | `to_tsvector('english', section ‖ article ‖ text)`, kept in sync by Postgres |

Indexes: **HNSW** on `embedding` with `vector_cosine_ops` (must match the `<=>` operator used in queries, or it is ignored), **GIN** on `tsv` (word → rows). The `vector` extension is created in `public` so tests can run in their own schema (D15).

## 5. Failure modes _(to be completed per phase)_

| Failure | Handling |
|---|---|
| Missing / invalid env variable | App refuses to start; error lists every problem ✅ |
| Database unreachable | Pool gives up after 2 s; `/health` returns 503 instead of hanging ✅ |
| Model unreachable / timeout | Retry once, then a clear error response _(planned)_ |
| Malformed JSON from the model | Retry once, then a clear error response _(planned)_ |
| Quote not found in cited chunk | Citation marked invalid in the response _(planned)_ |
| Question outside the corpus | Refusal via score threshold or model signal _(planned)_ |
| Chunk longer than the embedder's input window | Prevented by the 250-token limit (D7); if a single sentence were still too long, ingestion logs a warning ✅ |
| Ingestion fails halfway (DB error, crash) | Transaction rolls back; previous chunks stay intact; command exits non-zero ✅ |
| No corpus files found | Ingestion stops with a clear error instead of emptying the table ✅ |
| Query made only of stop words ("the of and") | Keyword search returns no rows instead of an error ✅ |
| One retriever finds nothing | Hybrid still returns the other retriever's results ✅ |
| Casually worded question (vocabulary mismatch) | Known weakness: keyword search degrades, hybrid can be dragged down (D18 observation); measured in Phase 4 |
| Selective document filter on a large corpus | HNSW filters after the index scan → possibly fewer than k rows (D20); not an issue at 99 chunks |
