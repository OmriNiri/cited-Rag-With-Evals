# Decisions

One entry per decision: context, options considered, choice, trade-off. New entries are added as they are made. If a decision is reversed, the old entry stays and is marked _superseded_.

---

## D1 — Corpus: Swiss Code of Obligations, employment-contract articles

- **Context:** a small (10–25 pages), public, legally reusable document set with clear structure.
- **Options:** (a) Swiss employment-contract law; (b) Swiss residence/permit guidance; (c) open-source tool documentation.
- **Choice:** (a), narrowed in Phase 0 to **Section One: The Individual Employment Contract, Art. 319–343** (English, consolidated version of 2026-10-01).
- **Why:** numbered articles give a natural chunk boundary and precise gold references for evaluation ("Art. 335c"). Official Swiss enactments *and their official translations* are not protected by copyright (Art. 5 para. 1 a and para. 2 Copyright Act, verified on fedlex).
- **Why only Section One (measured):** the whole title is 140 articles, ≈37 pages, above the 10–25 page target. Section One alone is ≈25 pages and holds the core topics (salary, holidays, sick pay, notice, dismissal). The dropped Art. 361–362 are mostly lists of article numbers, which would add noise to keyword search.
- **Trade-off:** the English text has no legal force; only the German, French and Italian versions are binding. Noted in `corpus/SOURCES.md` and the README. The project is a demonstration, not legal advice.

## D2 — Runtime: Node.js 24 LTS

- **Context:** the original plan said Node 22 LTS; the development machine has Node 24.
- **Options:** install Node 22 via nvm; use Node 24.
- **Choice:** Node 24 (an LTS line, supported into 2028).
- **Trade-off:** none in practice for this project. CI pins the same major version so local and CI behave the same.

## D3 — Embeddings: local `Xenova/all-MiniLM-L6-v2` (384 dimensions)

- **Context:** chunks and questions must be turned into vectors.
- **Options:** hosted embedding API (better quality, needs a key, costs money, results can change when the provider updates the model); local model via `@huggingface/transformers`.
- **Choice:** local MiniLM.
- **Why:** free, no key, runs offline and in CI, deterministic.
- **Trade-off:** lower retrieval quality than large hosted models, and a short input window (≈256 tokens; longer input is silently cut off). This limits chunk size (see D7). Keyword search in the hybrid retriever partly compensates.
- **Settings (Phase 1):** fp32 weights, mean pooling, normalized to length 1 (how the model was trained; cosine similarity becomes a dot product). Measured: the same text in the same batch gives bit-identical vectors; the same text inside a different batch differs by ≈1e-7 (padding changes floating-point order), which cannot change a ranking. The model (≈90 MB) is downloaded once and cached; it runs on macOS (dev) and Linux (CI).

## D4 — Answer generation and judging: local open-weight model via Ollama, behind an OpenAI-compatible client

- **Context:** the original plan used the Anthropic API. A Claude Pro subscription does not include API access, and the goal is a working, measured pipeline rather than maximum answer quality.
- **Options:**
  - Anthropic API — strong model, paid, needs a key.
  - Hosted open-weight model (Hugging Face, Groq, OpenRouter) — bigger models, but needs a key, has rate limits, sends data to a third party, and free tiers change over time.
  - Local open-weight model via Ollama — free, offline, reproducible, but a smaller model (7–8B on 16 GB RAM).
- **Choice:** local model via Ollama. The app talks to it through one `LlmClient` that uses the **OpenAI-compatible** chat API, configured by `LLM_BASE_URL`, `LLM_API_KEY` and `LLM_MODEL`.
- **Why:** anyone can run the full project without an account. Because Ollama and most hosted providers expose the same API format, switching to a hosted model is a configuration change, not a code change.
- **Trade-off:** a small model follows JSON and verbatim-quote instructions less reliably, and is a weaker judge. Mitigations: JSON-schema output where the server supports it, retry once on malformed output, a deterministic citation validator, a strict judge rubric, and manual spot-checks of judge verdicts. Results will be lower than with a frontier model, and are reported as measured.
- **Exact model:** `llama3.1:8b`, chosen in Phase 3 by comparing two candidates on 10 questions (D26).

## D5 — Database access: `pg` with hand-written SQL, no ORM

- **Options:** Prisma, TypeORM, `pg` with raw SQL.
- **Choice:** `pg` with raw SQL in one repository class.
- **Why:** pgvector operators (`<=>`) and full-text search (`tsvector`, `ts_rank`) are the core of the project and are clearest in plain SQL. ORMs support the `vector` type poorly and would hide the queries that need explaining.
- **Trade-off:** no generated types or migration tooling; schema is a small SQL file, and query results are typed by hand.

## D6 — Test runner: Jest _(superseded by D8)_

- **Options:** Jest, Vitest.
- **Choice:** Jest, NestJS's default.
- **Why:** works with Nest's testing utilities out of the box; one less thing to configure.
- **Trade-off:** slower than Vitest; irrelevant at this size.

## D7 — Chunk size: structure first, ≤ 250 model tokens per embedding input

- **Context:** the original plan suggested 300–500 tokens per chunk, but the embedder (D3) only reads about 256 tokens.
- **Direction:** split by article first; keep chunks under the embedder's window (≈200–250 tokens) with a small overlap, so no text is silently ignored when embedding. To be confirmed with real article-length statistics in Phase 1.
- **First measurement (Phase 0, corpus script):** median article ≈110 words (≈150 tokens), so most articles fit in one chunk; only a handful of long articles (e.g. Art. 336c, Art. 329b) need splitting.
- **Choice (Phase 1):**
  1. One article = one chunk whenever it fits; two articles are never merged.
  2. The limit is **250 tokens for the whole embedding input** (heading path + article number + text), counted with MiniLM's own tokenizer incl. its `[CLS]`/`[SEP]` tokens. Long headings therefore leave less room for text.
  3. A long article is packed paragraph by paragraph; an oversized paragraph is split into its list items, then sentences; a sentence is never cut.
  4. Overlap: a new piece starts with the previous paragraph if that is ≤ 60 tokens (typically an intro line such as "Notice of termination is unlawful where given by one party:").
- **Measured result (real tokenizer):** articles have a median of 126 tokens incl. header, max 496; 6 of 91 exceed the limit (Art. 329b, 331, 331d, 331e, 336, 336c). Result: **99 chunks**, median 131 tokens, max 234, **0 over 256**, so the model never truncates. An earlier estimate (words × 1.3) predicted 9 split articles, which shows why counting with the real tokenizer matters.
- **Trade-off:** chunks are small (good precision, one topic each), but a question spanning two articles needs both to be retrieved. Revisited in Phase 4 with eval numbers (top-k).

## D8 — Test runner: Vitest (supersedes D6)

- **Context:** D6 chose Jest because it was NestJS's default. Scaffolding showed that NestJS 12 is ESM-only and now generates Vitest by default.
- **Options:** keep Jest (needs experimental Node flags and extra config to run ESM); switch to Vitest.
- **Choice:** Vitest.
- **Why:** framework default again, native ESM, no extra config. API (`describe`/`it`/`expect`) is almost identical to Jest's, mocks are `vi.fn()`.
- **Trade-off:** slightly less widespread than Jest in older Nest codebases.

## D9 — Linter: oxlint (with Prettier for formatting)

- **Context:** the original plan said ESLint + Prettier; NestJS 12 scaffolds oxlint.
- **Options:** ESLint; oxlint.
- **Choice:** oxlint in type-aware mode, as generated, plus Prettier. CI runs `format:check` (verify only, never rewrites).
- **Why:** framework default, already configured, much faster, and includes the type-aware rules that matter here (e.g. `no-floating-promises`).
- **Trade-off:** ESLint is better known and has more plugins; none are needed for this project.

## D10 — Code layout: features for business logic, `infrastructure/` for the outside world

- **Context:** keep business rules separate from databases, models and config.
- **Options:** flat Nest feature folders only; full clean architecture (domain / application / infrastructure / presentation layers with mappers); a light ports-and-adapters split.
- **Choice:** feature folders (`ingestion/`, `retrieval/`, `answering/`) for business logic, one `src/infrastructure/` folder (config, database, embeddings, LLM client) for code that talks to external systems. Business code depends on interfaces; infrastructure implements them; Nest's dependency injection connects them. `docker-compose.yml` stays at the repo root so `docker compose up` works without `-f`.
- **Why:** pure logic (chunker, RRF, citation validator, metrics) is unit-testable without a database or model, and swapping Ollama or the embedder only touches `infrastructure/`.
- **Trade-off:** one extra folder level; full clean architecture would be over-engineering at ~15 files.

## D11 — Corpus is generated by a committed script from a pinned source

- **Options:** convert once by hand and commit only the text; commit a script that downloads and converts.
- **Choice:** `scripts/corpus/` (download → parse → render, one file each), pinned to one fedlex file URL and version date. The generated text is also committed, so the project still runs offline.
- **Why:** anyone can verify that the corpus matches the official source, and updating to a new law version is one config change plus a re-run.
- **Trade-off:** one dev dependency (`cheerio`, HTML parsing) and a parser tied to fedlex's HTML structure. If that structure changes, only `parse-articles.ts` needs updating.

## D12 — Schema applied idempotently by the ingest command, no migration tool

- **Context:** the database has one table. It must exist before ingestion, in development, CI and tests.
- **Options:** a migration tool (versioned up/down migrations); a separate `db:migrate` command; `schema.sql` with `IF NOT EXISTS`, applied automatically.
- **Choice:** one `schema.sql` (every statement `IF NOT EXISTS`) applied by `npm run ingest` on every run, and by the integration tests inside their own schema. `CREATE EXTENSION vector SCHEMA public` keeps the extension in one place even when tests run in a temporary schema.
- **Why:** quickstart stays `docker compose up -d` → `npm run ingest`; one table does not justify migration tooling.
- **Trade-off:** `IF NOT EXISTS` never changes an existing table. After changing a column, local data is reset with `docker compose down -v`. With real users or more tables, versioned migrations would be the first thing to add.

## D13 — Embed and index the heading path with the text; store the bare text

- **Context:** many articles never repeat their topic in their own text (Art. 335c is about notice periods "after the probation period", but its text never says "probation").
- **Options:** embed only the text; prepend the heading path and article number for search.
- **Choice:** embedding input and full-text index = `section + article + text`. The `text` column stores only the law text.
- **Why:** questions phrased like the heading still find the article. Verified in Phase 1: a keyword query "notice period probation" returns Art. 335c, matched through its heading. The bare `text` column is what Phase 3's citation validator compares quotes against, so it must be exactly the law text.
- **Trade-off:** headings use part of the 250-token budget (D7), so long-headed articles get slightly smaller chunks.

## D14 — Idempotent ingestion = replace each document in one transaction

- **Options:** insert only (duplicates on re-run); upsert by id; delete the document's chunks then insert, in one transaction.
- **Choice:** `BEGIN → DELETE … WHERE document = $1 → INSERT all → COMMIT`, `ROLLBACK` on any error, on one dedicated pooled connection.
- **Why:** an upsert never deletes, so chunks that disappear from a shorter or re-chunked document would stay searchable and citable forever. The transaction makes the replacement all-or-nothing: a failure keeps the old data.
- **Verified by integration tests:** re-run gives identical rows; a shorter document loses its stale chunks; a failure halfway keeps the old rows; the connection goes back to the pool clean. A deliberate mutation (ROLLBACK removed) made two of those tests fail.
- **Trade-off:** each run rewrites all rows of a document (≈100 rows, ~2 s including embedding). For a large corpus, re-embedding only changed chunks (by content hash) would be the next step.

## D15 — Integration tests run in a temporary Postgres schema

- **Options:** a separate test database; Testcontainers (a fresh container per run); a temporary schema in the existing database.
- **Choice:** each test file creates `test_<random>`, sets `search_path=test_<random>,public`, applies the schema, and drops it afterwards. CI runs the same tests against a Postgres service with the same pinned image as `docker-compose.yml`.
- **Why:** real database engine, no change to Docker setup, developer data in `public` never touched, nothing left behind.
- **Trade-off:** assumes the tests may create schemas in the configured database (true for the local and CI databases).

## D16 — Readable, deterministic chunk ids

- **Options:** random UUIDs; content hashes; `<document>:<article>:<part>`.
- **Choice:** e.g. `co-individual-employment-contract:art-335c:0`, built from the file name and article number (no hidden abbreviation table).
- **Why:** re-ingestion produces the same ids, so eval gold references and citations stay valid; the model can copy a readable id more reliably than a hash; a human can see from the id which article was cited.
- **Trade-off:** ids change if an article is re-split into a different number of parts; gold references in Phase 4 therefore point at the article, not the part.

## D17 — Keyword search matches ANY word (OR), ranked by `ts_rank`

- **Context:** Postgres turns a natural-language question into an AND query (`plainto_tsquery` / `websearch_to_tsquery`): every word must appear in the chunk.
- **Measured (Phase 2):** for "How long is the notice period after the probation period?", AND produced `long & notic & period & probat & period` and matched **0 of 99 chunks**; OR matched 36, which `ts_rank` then orders.
- **Options:** AND (precise, but natural questions find nothing); OR + ranking; a hand-made stop-word/keyword extraction step.
- **Choice:** OR — replace `&` by `|` in the `plainto_tsquery` output, rank with `ts_rank`. Stop words are already dropped by the `english` configuration; a stop-word-only query returns no rows instead of an error.
- **Why:** questions are written by people, not search experts. Chunks matching more and rarer words still rank first.
- **Trade-off:** common words (e.g. "employer", "employee") match many chunks, so keyword results get noisy for casually phrased questions (see D18 observation). An integration test fails if the query is switched back to AND (verified by mutation).

## D18 — Hybrid retrieval = RRF (k = 60) over the top 20 of vector and keyword search

- **Options:** vector only; keyword only; weighted sum of normalised scores; reciprocal rank fusion.
- **Choice:** both retrievers run in parallel, each returning `max(20, limit)` candidates; RRF (`Σ 1/(60 + rank)`, ties broken by id) merges them; the top `limit` are returned with the RRF score.
- **Why RRF:** cosine similarity and `ts_rank` are on unrelated scales; RRF uses only positions, so no score normalisation is needed. k = 60 is the constant from the original paper (Cormack et al., 2009); larger k makes agreement between the lists count more than a single #1 (shown in a unit test).
- **Why 20 candidates:** a chunk ranked e.g. 12th by one method and 3rd by the other must be in both lists for RRF to reward it.
- **Trade-off:** RRF gives both lists equal weight, so a noisy list can pull good results down. Candidate depth and the value of hybrid at all are measured in Phase 4.
- **Early observation — not a measurement (2 hand-picked questions, Phase 2):** for the correct article Art. 336c,
  - casual wording "Can my employer fire me while I am sick?": vector rank 11, keyword 61, hybrid 23;
  - legal wording "Can the employer terminate the employment while the employee is ill?": vector 7, keyword **1**, hybrid 3.

  Hypothesis for Phase 4: keyword search is strong when the question uses the law's vocabulary and weak otherwise; hybrid helps only when both lists carry signal. The eval set should therefore contain both casual and legal phrasings.

## D19 — Separate read and write interfaces for the chunks table

- **Options:** one `ChunkRepository` interface with write and search methods; one interface per feature.
- **Choice:** `ChunkStore` (ingestion, write) and `ChunkSearch` (retrieval, read), implemented by two small classes (`ChunksRepository`, `ChunksSearchRepository`) that share the same pool.
- **Why:** each feature depends only on what it uses (interface segregation), so fakes in unit tests stay tiny and retrieval cannot write.
- **Trade-off:** two classes and two tokens instead of one.

## D20 — Document filter as a plain `WHERE` clause

- **Choice:** `WHERE ($2::text IS NULL OR document = $2)`, one query for filtered and unfiltered search, values always passed as parameters (no SQL built from user input).
- **Trade-off at scale:** with an approximate index (HNSW), Postgres finds the nearest candidates first and filters afterwards, so a selective filter can return fewer than `limit` rows. Irrelevant at 99 chunks; with a large corpus, pgvector's iterative index scans (`hnsw.iterative_scan`) or a partial index per document would be the fix.

## D21 — Schema setup serialised with a Postgres advisory lock

- **Context (found by CI, Phase 2):** on a brand-new database, the integration test files (run in parallel by Vitest) each called `applySchema` at the same moment. `CREATE EXTENSION IF NOT EXISTS` is check-then-create, not atomic: two sessions both saw "missing", both created, and the second failed with `duplicate key value violates unique constraint "pg_extension_name_index"`. Locally it never showed, because the dev database already had the extension. Reproduced 5/5 on a fresh local database before fixing.
- **Options:** run test files one at a time (`fileParallelism: false`) — hides the bug, slower; create the extension once in a Vitest global setup — fixes only the tests; serialise `applySchema` itself.
- **Choice:** `applySchema` runs in one transaction that first takes `pg_advisory_xact_lock(<fixed key>)`. Concurrent callers wait their turn; the second one then sees the extension and skips it. The lock is tied to the transaction, so it is released on COMMIT or ROLLBACK and cannot leak.
- **Why:** fixes the cause, not the symptom — the same race would hit two `npm run ingest` processes started at once on a new database.
- **Verified:** 5/5 passing runs on a fresh database after the fix (0/5 before).

## D22 — LLM settings are validated by `LlmModule`, not at app startup

- **Options:** add `LLM_*` to the startup validation (`validateEnv`); validate them where they are used.
- **Choice:** `validateEnv` checks only what every process needs (`DATABASE_URL`, `PORT`) and **passes all other variables through unchanged**. `LlmModule` reads `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_TIMEOUT_MS` through `ConfigService` and validates them in `readLlmConfig`, listing every problem at once.
- **Why:** `npm run ingest` and `npm run search` never call a model and should not fail because `LLM_MODEL` is empty. Processes that do answer questions (`POST /ask`, `npm run ask`) still fail at startup, not at the first question.
- **Bug found while wiring it (Phase 3):** `@nestjs/config` keeps **only the keys that the `validate` function returns**. The first `validateEnv` returned just `{ DATABASE_URL, PORT }`, so the `LLM_*` lines of `.env` were silently dropped and the API failed with "LLM_MODEL is required". Unit tests did not catch it because no test loaded a real `.env` file. Fix: return `{ ...raw, DATABASE_URL, PORT }`. Guarded by `llm.module.spec.ts` (temporary `.env` file → `validateEnv` → `LlmModule`), which failed before the fix.

## D23 — The model cites passage numbers; code maps them to chunk ids

- **Options:** show chunk ids (`co-individual-employment-contract:art-335c:0`) and let the model copy them; number the passages `[1]..[n]` and let the model cite the number.
- **Choice:** numbers. Passage `[i]` in the prompt is `hits[i - 1]`; `validateCitations` maps the number back to the chunk id. A number that was not shown is flagged `unknown_passage`.
- **Why:** a short number is much harder for a small model to garble than a long id, and the mapping is done by code that is unit-tested, not trusted to the model.
- **Trade-off:** the response shows both: `passage` (what the model said) and `chunkId` (what code resolved), so a wrong number is visible.

## D24 — What "verbatim" means for a citation

- **Rule:** after normalising both sides, the quote must be a **substring of the cited chunk's stored text** (not of its heading) and have **at least 4 words**.
- **Normalisation — only differences that change no word:** typographic → plain characters (`’ ‘` → `'`, `“ ”` → `"`, `– —` → `-`); any whitespace run incl. line breaks → one space; trim; drop a trailing `. , ; :`.
- **Not normalised:** case, word order, spelling, any other punctuation. A different capital letter means the text was not copied exactly.
- **Why:** the corpus uses typographic apostrophes (`month’s`) and models usually write `'`; without this, correct quotes would fail. Everything beyond that would start accepting paraphrases.
- **Why ≥ 4 words:** a quote like "the employer" appears in almost every chunk and proves nothing.
- **Options rejected:** fuzzy matching (edit distance / similarity threshold) — accepts paraphrases and needs its own tuning; case-insensitive matching — little gain, weaker guarantee.
- **Limitation (measured, see D26):** the check proves the quote **exists** in the chunk, not that it **supports** the answer. That is measured by the faithfulness judge in Phase 4.

## D25 — Three refusal gates; similarity threshold 0.35 (provisional)

- **Gate 1 — before the model:** if the best **vector** cosine similarity is below `MIN_TOP_SIMILARITY` (0.35), refuse with `low_retrieval_score` and do not call the model. The vector score is used because it has a fixed meaning; the hybrid (RRF) score only encodes ranks. An empty table counts as similarity 0.
- **Gate 2 — the model:** the model sets `refused: true` (or returns an empty answer) → `model_insufficient_context`.
- **Gate 3 — after validation:** no citation survived the verbatim check (D24) → `no_valid_citation`; the rejected citations are still returned so the reason is visible. An answer with at least one valid citation is returned, with any invalid ones flagged.
- **Threshold data (10 hand-picked questions, Phase 3):** top vector similarity of 5 in-scope questions 0.43 / 0.64 / 0.65 / 0.67 / 0.70; of 5 out-of-scope questions 0.14 / 0.21 / 0.25 / 0.27 / 0.42. The ranges overlap ("How much unemployment insurance will I receive?" = 0.42, "Can my employer fire me while I am sick?" = 0.43), so no threshold separates them perfectly.
- **Choice:** 0.35 — blocks clearly unrelated questions without a model call, and leaves borderline ones to gates 2–3 (in the model comparison, the 0.42 question was refused by gate 2).
- **Status:** provisional. Phase 4 chooses the value from the 40-question eval set and records the trade-off (false refusals vs answered out-of-scope questions).
- **A refusal is a normal result:** `POST /ask` returns 200 with `refused: true` and the reason, not an error status.

## D26 — Answer model: `llama3.1:8b`

- **Candidates:** `qwen3:8b` and `llama3.1:8b` (both 8B, Q4_K_M, ~5 GB, run by Ollama 0.40.16 on the development laptop).
- **Method (model selection, not the final eval):** the same 10 questions as D25 through the real pipeline pieces — hybrid top 5 → `buildPrompt` → `OpenAiCompatibleClient` (temperature 0, JSON schema requested) → `parseModelAnswer` → `validateCitations` → gates 2–3. To test gate 2, the model was called for the out-of-scope questions too, even where gate 1 would have refused. One warm-up call per model, so load time is not counted. One-off script, not committed; Phase 4 measures the chosen model properly.

  | | llama3.1:8b | qwen3:8b |
  |---|---|---|
  | Valid JSON | **10/10** | 9/10 |
  | In-scope questions answered with a valid citation | **5/5** | 4/5 |
  | Citations passing the verbatim check | 5/5 | 4/4 |
  | Out-of-scope questions refused by the model | 5/5 | 5/5 |
  | Seconds per answer (min / median / max) | **5.9 / 7.6 / 16.1** | 16.8 / 18.8 / 29.6 |
  | Failures | none | no reply within 300 s on "Can my employer fire me while I am sick?" (cause not investigated) |

- **Choice:** `llama3.1:8b` — fully reliable JSON, no hangs, about 2–3× faster. `qwen3` put no `<think>` text into the reply content, so the parser's stripping was not needed by either.
- **Observed limitation (both models, not only the chosen one):** a **real quote can back a wrong or off-topic answer**. "Can my employer fire me while I am sick?" — retrieval missed Art. 336c (the D18 casual-wording weakness) and llama answered "No, the employer must provide care…", quoting Art. 328a correctly. "Can an employer change my salary without my agreement?" — answered with a correct quote from Art. 323b (salary used for the employer's benefit), which does not answer the question. Both citations pass D24. Both questions go into the Phase 4 eval set so the faithfulness metric is checked on known failures.

## D27 — Model errors: retry once, then 503

- **Choice:** `completeWithRetry` makes at most 2 attempts (`LLM_ATTEMPTS`). Calling and parsing are retried together, so a malformed reply is retried like a timeout. Only errors the client marks **retryable** are retried: timeout, unreachable server, HTTP 5xx / 429, non-JSON body, missing content, malformed answer JSON. A 4xx such as 401 or 404 fails at once — it will not fix itself.
- **After the retry:** `POST /ask` returns **503** ("try again later"); the real reason goes to the server log only, so internal addresses are not shown to clients. Bad input → 400. Any other error (bug, database) → 500.
- **Why only one retry:** with a local model, a second failure usually means the server is down or the question reliably breaks the model; more retries mostly make the user wait longer (each attempt can take up to `LLM_TIMEOUT_MS`, default 60 s).
- **Verified:** with `LLM_BASE_URL` pointing at a closed port, `POST /ask` returned 503 and the log showed "Model failed after retry: LLM server unreachable…".
