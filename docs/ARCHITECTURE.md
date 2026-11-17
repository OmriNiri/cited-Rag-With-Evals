# Architecture

> **Status: Phase 4 built** (setup, ingestion, retrieval, answering, and evaluation: retrieval and answer metrics on a verified 40-question set, an LLM judge checked against human labels, and the retriever / threshold / top-k chosen from those numbers). Each section is updated as its phase is built; anything not built yet is marked _(planned)_.

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

    subgraph Eval["Evaluation (npm run eval:*)"]
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
| `LlmClient` (interface) + `OpenAiCompatibleClient` | `POST {LLM_BASE_URL}/chat/completions`, temperature 0, JSON schema requested, timeout; every failure becomes an `LlmError` marked retryable or not (D27) | 3 ✅ |
| `LlmModule` | Reads and validates the `LLM_*` settings, binds `LLM_CLIENT` (D22) | 3 ✅ |
| Prompt builder | System rules + passages numbered `[1]..[n]` + the question last (D23) | 3 ✅ |
| Model-answer parser | Strips code fences / `<think>`, checks the JSON shape by hand; malformed → retryable error | 3 ✅ |
| `completeWithRetry` | Call + parse, at most 2 attempts, only for retryable errors (D27) | 3 ✅ |
| Citation validator | Pure: passage number → chunk; ≥ 4 words; normalised quote must be in the chunk text (D24) | 3 ✅ |
| Refusal policy | Pure: gate 1 (vector similarity < 0.35), gate 2 (model refused), gate 3 (no valid citation) (D25) | 3 ✅ |
| `AnswerService` | Connects the answering pipeline; used by both the API and the CLI | 3 ✅ |
| `POST /ask` + `npm run ask` | HTTP endpoint (400 / 200 / 503) and CLI over the same service | 3 ✅ |
| Eval set + loader | `eval/questions.jsonl` (40 questions, verified gold articles); parsed with every error listed by line number | 4 ✅ |
| Retrieval eval + threshold sweep | hit@k and MRR@10 per retriever and per wording; gate-1 refusals at 0.20–0.60 (no model) | 4 ✅ |
| Answer eval + metrics | Every question through `AnswerService`; refusal 2×2, citation validity, gold-citation rate, time (D28) | 4 ✅ |
| Faithfulness judge | Same model, fixed rubric, sees only the valid quotes; supported / partial / unsupported (D30) | 4 ✅ |
| Judge check | Blind sheet of 15 answers for hand labels; agreement + Cohen's kappa against the judge (D30) | 4 ✅ |

### 2.1 Code layout (D10)

```
src/
  main.ts                          HTTP bootstrap: create app, shutdown hooks, listen on PORT
  app.module.ts                    HTTP root module: config + database + controllers
  cli/                             command-line entry points (Nest without a web server)
    ingest.ts                      `npm run ingest`
    search.ts                      `npm run search` (+ parse-search-args, format-hits)
    ask.ts                         `npm run ask` (+ parse-ask-args, format-answer)
    eval-retrieval.ts              `npm run eval:retrieval`
    eval-answers.ts                `npm run eval:answers` (+ parse-eval-answers-args, --rescore)
    judge-sheet.ts, judge-agreement.ts   `npm run eval:judge-sheet` / `eval:judge-agreement`
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
    llm/                           readLlmConfig, OpenAiCompatibleClient, LlmModule
  retrieval/                       BUSINESS LOGIC
    retriever.ts                   INTERFACE Retriever + RETRIEVERS registry
    chunk-search.ts                INTERFACE ChunkSearch (+ CHUNK_SEARCH token)
    vector / keyword / hybrid .retriever.ts
    rrf.ts                         reciprocal rank fusion
    retrieval.config.ts            DEFAULT_TOP_K = 5, HYBRID_CANDIDATES = 20 (not tuned: /ask uses vector, D28)
  answering/                       BUSINESS LOGIC
    llm-client.ts, llm-error.ts    INTERFACE LlmClient (+ LLM_CLIENT token), LlmError(retryable)
    model-answer.ts                what the model must return + its JSON schema
    system-prompt.ts, build-prompt.ts   rules + numbered passages
    parse-model-answer.ts          raw reply -> ModelAnswer (or retryable error)
    complete-with-retry.ts         call + parse, one retry
    normalize-for-match.ts, validate-citations.ts   verbatim check
    refusal-policy.ts              the three gates
    answer.service.ts              the pipeline
    ask.controller.ts, parse-ask-body.ts   POST /ask
    answering.config.ts            MIN_TOP_SIMILARITY 0.35, ANSWER_TOP_K 5, ANSWER_RETRIEVAL_MODE vector (D28, D29)
  evaluation/                      BUSINESS LOGIC (offline measurement)
    parse-eval-set.ts, load-eval-set.ts   eval/questions.jsonl -> EvalQuestion[]
    metrics.ts, retrieval-eval.ts  first gold rank -> hit@k, MRR
    threshold-sweep.ts             best vector similarity -> refusals per threshold
    answer-eval.ts, answer-metrics.ts   AnswerService + judge per question -> summary
    relabel-rows.ts                --rescore: apply corrected labels to saved rows
    judge/                         judge prompt, verdict schema + parser, FaithfulnessJudge
    judge-check/                   pick-spread, blind sheet build/parse, agreement (kappa)
    format-*-report.ts, write-results.ts   markdown + JSON to eval/results/ (no timestamps)
    evaluation.config.ts           EVAL_DEPTH 10, EVAL_KS, SWEEP_THRESHOLDS, JUDGE_CHECK_SIZE 15
test/                              integration tests (*.int-spec.ts) + helpers
scripts/corpus/                    build-corpus.ts -> download / parse-articles / render-text
corpus/                            co-individual-employment-contract.txt, SOURCES.md
eval/                              questions.jsonl, VERIFICATION.md, JUDGE-CHECK.md, results/
```

Rule: business code depends on interfaces; `infrastructure/` implements them; Nest's dependency injection connects them. Example: `IngestionService` asks for `EMBEDDER` and `CHUNK_STORE`; `EmbeddingsModule` binds `EMBEDDER` to `MiniLmEmbedder`, `DatabaseModule` binds `CHUNK_STORE` to `ChunksRepository`. Unit tests use the business code with fakes (e.g. a word counter instead of the tokenizer).

### 2.2 Startup sequence (built)

```
main.ts → NestFactory.create(AppModule)
  → ConfigModule loads .env → validateEnv() → throws listing every invalid variable
      (checks DATABASE_URL + PORT, passes every other variable through — D22)
  → DatabaseModule builds one pg Pool from DATABASE_URL
  → LlmModule → readLlmConfig() → throws if LLM_MODEL / LLM_BASE_URL are invalid (D22)
  → HealthController receives the pool via @Inject(PG_POOL); AskController receives AnswerService
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

### 3.3 Answering a question (built)

```
POST /ask {"question": "..."}          or   npm run ask -- "<question>"
  → parseAskBody: non-empty string, ≤ 500 chars, trimmed          else 400
  → AnswerService.ask(question)
      vector top 1 → similarity < 0.35?          → refuse low_retrieval_score   (gate 1, no model call)
      vector top 5 → buildPrompt: system rules + [1]..[5] passages + question   (D28)
      completeWithRetry (≤ 2 attempts):
          OpenAiCompatibleClient → Ollama (llama3.1:8b, temperature 0, JSON schema)
          parseModelAnswer → { answer, citations: [{ passage, quote }], refused }
      model refused / empty answer?              → refuse model_insufficient_context (gate 2)
      validateCitations: passage → chunk id, ≥ 4 words, normalised quote ⊂ chunk text
      no valid citation?                         → refuse no_valid_citation       (gate 3)
  → 200 { refused, refusalReason?, answer, citations: [{ passage, chunkId, article, quote, valid, invalidReason? }] }
  → model still failing after the retry           → 503 (reason in the server log only)
```

Rule: an answer with no valid citation is never returned as a factual answer. Invalid citations are returned flagged, never hidden.

Examples (real runs through `AnswerService` with Postgres and llama3.1:8b): "How many weeks of holiday does an employee get per year?" → answered, citing Art. 329a word for word ("…at least four weeks’ holiday and five weeks’ holiday for employees under the age of 20."). "How do I bake sourdough bread?" → refused at gate 1.

**Known limitation:** the verbatim check proves a quote exists, not that it supports the answer — two real examples in D26, both still failing in the Phase 4 eval (q05, q40; see 3.4).

### 3.4 Evaluation (built)

```
eval/questions.jsonl (40: 30 answerable with gold article, 10 unanswerable; checked in eval/VERIFICATION.md)
  npm run eval:retrieval                                  (Postgres + embedder, no LLM, seconds)
    → each retriever, top 10 → rank of first gold article → hit@1/3/5/10, MRR@10, split casual / legal
    → best vector similarity per question → refusals at thresholds 0.20 … 0.60
    → eval/results/retrieval.*, threshold.*
  npm run eval:answers -- --mode vector                   (needs Ollama, minutes)
    → AnswerService.ask(question, mode) for all 40 → answered / refused / error
    → FaithfulnessJudge on answered rows (question + answer + valid quotes only)
    → refusal accuracy, citation validity, gold citation, judge counts, seconds
    → eval/results/answers-<mode>.*      (--rescore: recompute from saved rows, no model)
  npm run eval:judge-sheet → eval/JUDGE-CHECK.md (15 rows, blind) → hand labels
  npm run eval:judge-agreement → eval/results/judge-agreement.* (agreement, Cohen's kappa)
```

Results files have no timestamps, so a rerun that changes nothing gives an empty diff.

**Results** (real runs, `eval/results/`):

| Retrieval (30 answerable) | vector | keyword | hybrid |
|---|---|---|---|
| hit@5 | **29/30** | 20/30 | 25/30 |
| hit@5 casual / legal | **14/15** / 15/15 | 5/15 / 15/15 | 10/15 / 15/15 |
| MRR@10 | **0.754** | 0.566 | 0.670 |

| End to end (llama3.1:8b, top 5, threshold 0.35) | vector ← chosen | hybrid |
|---|---|---|
| Refusal accuracy (40) | 37/40 | 37/40 |
| Citation validity | 31/33 | 34/35 |
| Gold citation | 26/28 | 24/29 |
| Judge supported / partial / unsupported | 17 / 9 / 3 | 16 / 9 / 6 |
| Seconds median / max | 8.9 / 19.6 | 7.5 / 14.7 |

Judge vs human on 15 answers: 10/15 same verdict, Cohen's kappa 0.46 (D30). Choices and caveats: D28 (vector), D29 (threshold 0.35, top-k 5), D30 (judge), D31 (no quote re-mapping), D32 (method and limits).

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
| Model unreachable / timeout / HTTP 5xx | Retry once, then `POST /ask` → 503; reason in the server log (D27) ✅ |
| Model rejects the request (401, 404 unknown model) | No retry (will not fix itself) → 503 ✅ |
| Malformed JSON from the model | Retry once, then 503 ✅ |
| `LLM_MODEL` / `LLM_BASE_URL` missing or invalid | API and `npm run ask` refuse to start; ingest and search are unaffected (D22) ✅ |
| Quote not found in cited chunk, too short, or unknown passage number | Citation marked invalid with the reason; no valid citation at all → refusal (gate 3) ✅ |
| Question outside the corpus | Gate 1 (similarity < 0.35, no model call), gate 2 (model refuses) or gate 3 ✅ — 9/10 unanswerable refused in the eval; threshold margin is thin (D29) |
| Empty `chunks` table | Every question refused at gate 1 instead of crashing ✅ |
| Real quote attached to a wrong / off-topic answer | **Not caught** at answer time (D24). Measured offline: gold-citation rate 26/28 and the judge (kappa 0.46 with a human, D30). q05 and q40 still fail |
| Chunk longer than the embedder's input window | Prevented by the 250-token limit (D7); if a single sentence were still too long, ingestion logs a warning ✅ |
| Ingestion fails halfway (DB error, crash) | Transaction rolls back; previous chunks stay intact; command exits non-zero ✅ |
| No corpus files found | Ingestion stops with a clear error instead of emptying the table ✅ |
| Several processes set up the schema at once (fresh database) | Advisory lock makes them take turns (D21) ✅ |
| Query made only of stop words ("the of and") | Keyword search returns no rows instead of an error ✅ |
| One retriever finds nothing | Hybrid still returns the other retriever's results ✅ |
| Casually worded question (vocabulary mismatch) | Measured: keyword hit@5 5/15, hybrid 10/15, vector 14/15 → the pipeline uses vector (D28) |
| Model gives the wrong passage number for a real quote | Citation invalid → refusal if none is left; not re-mapped (D31, q17) |
| Selective document filter on a large corpus | HNSW filters after the index scan → possibly fewer than k rows (D20); not an issue at 99 chunks |
