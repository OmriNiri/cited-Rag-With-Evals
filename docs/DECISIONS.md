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

## D4 — Answer generation and judging: local open-weight model via Ollama, behind an OpenAI-compatible client

- **Context:** the original plan used the Anthropic API. A Claude Pro subscription does not include API access, and the goal is a working, measured pipeline rather than maximum answer quality.
- **Options:**
  - Anthropic API — strong model, paid, needs a key.
  - Hosted open-weight model (Hugging Face, Groq, OpenRouter) — bigger models, but needs a key, has rate limits, sends data to a third party, and free tiers change over time.
  - Local open-weight model via Ollama — free, offline, reproducible, but a smaller model (7–8B on 16 GB RAM).
- **Choice:** local model via Ollama. The app talks to it through one `LlmClient` that uses the **OpenAI-compatible** chat API, configured by `LLM_BASE_URL`, `LLM_API_KEY` and `LLM_MODEL`.
- **Why:** anyone can run the full project without an account. Because Ollama and most hosted providers expose the same API format, switching to a hosted model is a configuration change, not a code change.
- **Trade-off:** a small model follows JSON and verbatim-quote instructions less reliably, and is a weaker judge. Mitigations: JSON-schema output where the server supports it, retry once on malformed output, a deterministic citation validator, a strict judge rubric, and manual spot-checks of judge verdicts. Results will be lower than with a frontier model, and are reported as measured.
- **Exact model:** chosen in Phase 3 by trying two candidates on a few questions.

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

## D7 — Chunk size _(open — decided in Phase 1)_

- **Context:** the original plan suggested 300–500 tokens per chunk, but the embedder (D3) only reads about 256 tokens.
- **Direction:** split by article first; keep chunks under the embedder's window (≈200–250 tokens) with a small overlap, so no text is silently ignored when embedding. To be confirmed with real article-length statistics in Phase 1.
- **First measurement (Phase 0, corpus script):** median article ≈110 words (≈150 tokens), so most articles fit in one chunk; only a handful of long articles (e.g. Art. 336c, Art. 329b) need splitting.

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
