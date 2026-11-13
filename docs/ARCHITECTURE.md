# Architecture

> **Status: draft.** This describes the *intended* design. Each section is updated as its phase is built; anything not built yet is marked _(planned)_.

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
| Loader | Read `corpus/` files with their source metadata | 1 _(planned)_ |
| Chunker | Split text by structure (articles), then by size with overlap | 1 _(planned)_ |
| Embedder | Turn text into 384-number vectors with a local model | 1 _(planned)_ |
| Chunks repository | All SQL for the `chunks` table | 1 _(planned)_ |
| Retrievers | Vector, keyword and hybrid (RRF) search behind one interface | 2 _(planned)_ |
| Prompt builder | Number the passages and state the answering rules | 3 _(planned)_ |
| `LlmClient` | Call the model over an OpenAI-compatible HTTP API; retry once | 3 _(planned)_ |
| Citation validator | Deterministic check that each quote is verbatim in its chunk | 3 _(planned)_ |
| Refusal policy | Refuse on low retrieval score or model-reported insufficiency | 3 _(planned)_ |
| Eval runner | Compute metrics and write results files | 4 _(planned)_ |

## 3. Data flows

### 3.1 Ingestion _(planned)_

```
corpus/*.txt → Loader → Chunker → Embedder → upsert into chunks
```

Ingestion is **idempotent**: each chunk's id is derived from its content and position, so re-running updates rows instead of duplicating them.

### 3.2 Answering a question _(planned)_

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

### 3.3 Evaluation _(planned)_

```
eval/questions.jsonl
  → for each retriever: hit@5, MRR against gold chunks       (no model needed — runs in CI)
  → full /ask pipeline: citation validity, refusal accuracy,
    faithfulness via LLM judge                                 (needs local model — run manually)
  → eval/results/*.json + summary table
```

## 4. Database schema _(planned)_

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  id         TEXT PRIMARY KEY,        -- deterministic, enables idempotent re-ingestion
  document   TEXT NOT NULL,           -- source file
  section    TEXT,                    -- e.g. "Art. 335c"
  position   INT  NOT NULL,           -- order within the document
  text       TEXT NOT NULL,
  embedding  vector(384) NOT NULL,
  tsv        tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED
);

CREATE INDEX chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX chunks_tsv_gin        ON chunks USING gin (tsv);
```

Final column choices will be confirmed in Phase 1.

## 5. Failure modes _(to be completed per phase)_

| Failure | Handling |
|---|---|
| Model unreachable / timeout | Retry once, then a clear error response _(planned)_ |
| Malformed JSON from the model | Retry once, then a clear error response _(planned)_ |
| Quote not found in cited chunk | Citation marked invalid in the response _(planned)_ |
| Question outside the corpus | Refusal via score threshold or model signal _(planned)_ |
| Chunk longer than the embedder's input window | Avoided by chunk-size limit (see DECISIONS) _(planned)_ |
