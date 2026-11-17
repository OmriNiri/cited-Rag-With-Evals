# CLAUDE.md

Conventions for AI coding agents (and humans) working in this repository.

## Project

Cited-answer RAG over Swiss employment-contract law, with measured retrieval and answer quality. See:

- `docs/ROADMAP.md` — phases, branches, status (source of truth for *what* to build next)
- `docs/ARCHITECTURE.md` — components, data flow, schema
- `docs/DECISIONS.md` — why each choice was made, including rejected alternatives

Read all three before changing code.

## Stack

- Node.js 24, TypeScript (`strict: true`), NestJS 12
- PostgreSQL 16 + pgvector, full-text search via `tsvector` — accessed with `pg` and raw SQL (no ORM)
- Embeddings: local `Xenova/all-MiniLM-L6-v2` via `@huggingface/transformers`
- LLM: local model via Ollama, accessed through an OpenAI-compatible HTTP client (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`)
- Tests: Vitest. Unit tests: `src/**/*.spec.ts`. Integration tests: `test/**/*.int-spec.ts`, real PostgreSQL in a temporary schema
- Lint: oxlint (type-aware). Format: Prettier

### ESM rules (NestJS 12 is ESM-only)

- Relative imports end in `.js` in `src/` (`import { X } from './x.js'`), and in `.ts` in `scripts/` (run directly by Node).
- No `__dirname`; use `import.meta.dirname`.
- Mocks use `vi.fn()`, not `jest.fn()`.

## Layout

```
src/
  <feature>/            business logic by feature (ingestion/, retrieval/, answering/) + its interfaces
  cli/                  command-line entry points (Nest application context, no HTTP)
  health/               GET /health
  infrastructure/       everything that talks to the outside world
    config/             env validation
    database/           pg pool, repositories, schema.sql
    embeddings/         local embedding model
test/                   integration tests + test helpers (not in the production build)
scripts/corpus/         reproducible corpus build (download -> parse -> render)
corpus/                 generated plain-text corpus + SOURCES.md
docs/                   ROADMAP, ARCHITECTURE, DECISIONS
```

Business code depends on interfaces; implementations live in `infrastructure/` (see D10).

## Commands

```bash
docker compose up -d        # start PostgreSQL + pgvector (wait for "healthy": docker compose ps)
cp .env.example .env        # first time only
npm run start:dev           # API on http://localhost:3000 (GET /health, POST /ask)
npm run build               # compile src/ to dist/
npm run lint                # oxlint, src/ scripts/ test/
npm run format              # prettier --write   (format:check = verify only, used in CI)
npm test                    # unit tests (vitest, no database or model needed)
npm run test:int            # integration tests: real Postgres (temporary schema) + real model
npm run typecheck:scripts   # type-check scripts/ (not part of the Nest build)
npm run corpus:build        # re-generate corpus/ from the pinned fedlex source
npm run ingest              # build, then chunk + embed corpus/ into the chunks table (idempotent)
npm run search -- "<question>" --mode all   # compare vector / keyword / hybrid top-k (--k, --document)
npm run ask -- "<question>"     # full pipeline: retrieval -> model -> citation check -> answer or refusal
```

Update this list whenever a script is added.

## Rules

- **One phase at a time**, following `docs/ROADMAP.md`. Do not start work belonging to a later phase.
- **No magic.** No unexplained libraries or clever abstractions. Add a short comment wherever the *why* is not obvious.
- **Small files.** One responsibility per file; entry points only connect imported pieces.
- **Record decisions** in `docs/DECISIONS.md` when they are made, including rejected options.
- **Update `docs/ARCHITECTURE.md`** at the end of each phase to match what was actually built.
- **Never invent results.** Every number in docs or the README must come from a real, reproducible run. Failures and weak results go under "Limitations".
- **Never return an uncited factual answer** from the answering pipeline.
- Unit tests must not need a running model or network; mock the `LlmClient`.
- Do not create, switch, merge or push git branches, and do not commit. Propose a short conventional-commit message instead (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
