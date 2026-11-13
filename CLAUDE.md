# CLAUDE.md

Conventions for AI coding agents (and humans) working in this repository.

## Project

Cited-answer RAG over Swiss employment-contract law, with measured retrieval and answer quality. See:

- `docs/ROADMAP.md` — phases, branches, status (source of truth for *what* to build next)
- `docs/ARCHITECTURE.md` — components, data flow, schema
- `docs/DECISIONS.md` — why each choice was made, including rejected alternatives

Read all three before changing code.

## Stack

- Node.js 24, TypeScript (`strict: true`), NestJS
- PostgreSQL 16 + pgvector, full-text search via `tsvector` — accessed with `pg` and raw SQL (no ORM)
- Embeddings: local `Xenova/all-MiniLM-L6-v2` via `@huggingface/transformers`
- LLM: local model via Ollama, accessed through an OpenAI-compatible HTTP client (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`)
- Tests: Jest; integration tests use a real PostgreSQL (Docker)
- ESLint + Prettier

## Commands

_(Added in Phase 0; update this list whenever a script is added.)_

## Rules

- **One phase at a time**, following `docs/ROADMAP.md`. Do not start work belonging to a later phase.
- **No magic.** No unexplained libraries or clever abstractions. Add a short comment wherever the *why* is not obvious.
- **Record decisions** in `docs/DECISIONS.md` when they are made, including rejected options.
- **Update `docs/ARCHITECTURE.md`** at the end of each phase to match what was actually built.
- **Never invent results.** Every number in docs or the README must come from a real, reproducible run. Failures and weak results go under "Limitations".
- **Never return an uncited factual answer** from the answering pipeline.
- Unit tests must not need a running model or network; mock the `LlmClient`.
- Do not create, switch, merge or push git branches, and do not commit. Propose a short conventional-commit message instead (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
