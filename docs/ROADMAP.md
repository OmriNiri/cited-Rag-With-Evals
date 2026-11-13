# Roadmap

The project is built in small phases. Each phase lives on its own branch, created from `main` and merged back into `main` via a pull request (merge commit, not squash, so the step-by-step history stays visible).

Status legend: ⬜ not started · 🟨 in progress · ✅ merged

| Phase | Branch | Status |
|---|---|---|
| Plan | `docs/project-plan` | 🟨 |
| 0 — Setup | `chore/project-setup` | ⬜ |
| 1 — Ingestion | `feat/ingestion` | ⬜ |
| 2 — Retrieval | `feat/retrieval` | ⬜ |
| 3 — Answering | `feat/answering` | ⬜ |
| 4 — Evaluation | `feat/evaluation` | ⬜ |
| 5 — CI, docs, polish | `chore/ci-docs-polish` | ⬜ |

---

## Plan — `docs/project-plan`

**Goal:** agree on scope, architecture and decisions before writing code.

- `docs/ROADMAP.md`, `docs/ARCHITECTURE.md` (draft), `docs/DECISIONS.md`, `CLAUDE.md`, `.gitignore`

**Done when:** the plan is merged and every early decision is recorded.

## Phase 0 — Setup — `chore/project-setup`

**Goal:** an empty but runnable, linted, CI-checked NestJS project with a database.

- NestJS + TypeScript (`strict: true`) on Node 24
- ESLint + Prettier
- `docker-compose.yml`: PostgreSQL 16 with `pgvector`
- `.env.example` with every variable the app reads
- GitHub Actions: lint + build
- MIT `LICENSE`
- Corpus: plain-text copies of the Swiss Code of Obligations employment articles in `corpus/`, with `corpus/SOURCES.md` (URL, access date, reuse terms)

**Done when:** `docker compose up -d && npm install && npm run build` works from a fresh clone and CI is green.

## Phase 1 — Ingestion — `feat/ingestion`

**Goal:** the corpus is chunked, embedded and stored in PostgreSQL.

- Loader: reads `corpus/*.txt` / `*.md` with source metadata
- Chunker: split by structure (articles/headings) first, then by size with a small overlap; each chunk keeps `document`, `section`, `position`
- Embedder: local `Xenova/all-MiniLM-L6-v2` (384 dimensions)
- `chunks` table with an HNSW index (vector) and a GIN index (full text)
- Idempotent: re-running ingestion does not duplicate rows
- Tests: chunker unit tests (boundaries, overlap, metadata); ingestion integration test against real Postgres

**Done when:** `npm run ingest` fills the table, running it twice gives the same row count, and the tests pass.

## Phase 2 — Retrieval — `feat/retrieval`

**Goal:** three retrievers behind one interface.

- Vector-only (cosine distance via pgvector)
- Keyword-only (Postgres full-text search, `ts_rank`)
- Hybrid: reciprocal rank fusion (RRF) of the two lists, about 20 commented lines
- Optional filter on `document`
- Tests: RRF unit tests with hand-made rankings; retrieval integration test

**Done when:** a CLI command returns the top-k chunks for a question with each retriever.

## Phase 3 — Answering — `feat/answering`

**Goal:** `POST /ask` returns a cited answer, or refuses.

- `LlmClient` interface, implemented by an OpenAI-compatible HTTP client (local Ollama by default)
- Prompt: numbered passages; answer only from them; cite passage ids; say so if they are insufficient
- Output JSON: `{ answer, citations: [{ chunkId, quote }], refused }`
- Deterministic citation validator: each quote must appear verbatim in its cited chunk; invalid citations are flagged in the response
- Refusal when retrieval scores are below a threshold (tuned in Phase 4) or the model reports insufficient context; never return an uncited answer
- Error handling: timeouts, API errors, malformed JSON → retry once, then fail clearly
- Tests: prompt builder and validator unit tests; LLM mocked

**Done when:** `/ask` works end to end against the local model, and the unit tests pass without a model running.

## Phase 4 — Evaluation — `feat/evaluation`

**Goal:** measured quality, not assumed quality.

- `eval/questions.jsonl`: 40 questions, 30 answerable (with gold chunk/section) and 10 unanswerable
- The agent drafts candidates; **Omri verifies every gold reference against the source text**
- `npm run eval`:
  - Retrieval: hit@5 and MRR for vector vs keyword vs hybrid
  - Answers: faithfulness (LLM judge, fixed rubric), citation-validity rate, refusal accuracy
- Choose top-k and the refusal threshold from these numbers, and write down how
- Results committed under `eval/results/`

**Done when:** the results table exists, comes from a real run, and the chosen threshold is justified in `DECISIONS.md`.

## Phase 5 — CI, docs, polish — `chore/ci-docs-polish`

**Goal:** a finished, defensible repo.

- CI: lint, build, unit tests, integration tests (Postgres service), retrieval eval as a gate (fails if hit@5 drops below the threshold set from the baseline)
- The LLM eval is not part of normal CI (it needs a running model)
- `README.md`: problem, architecture diagram, quickstart, API examples with real responses, results table, limitations, not-legal-advice note
- Quickstart tested from a fresh clone

**Done when:** a fresh clone works with only the documented commands and CI is green.

### Optional (only if time remains and Omri agrees)

- A Claude / hosted-model run of the eval, for comparison (config change only)
- A small MCP server exposing `ask` as a tool
