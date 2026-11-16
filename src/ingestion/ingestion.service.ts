import { Inject, Injectable, Logger } from '@nestjs/common';
import { CHUNK_STORE, type ChunkStore } from './chunk-store.js';
import { chunkDocument } from './chunker.js';
import { MAX_EMBEDDING_TOKENS, MAX_OVERLAP_TOKENS } from './chunking.config.js';
import { embedChunks } from './embed-chunks.js';
import { EMBEDDER, type Embedder } from './embedder.js';
import { buildEmbeddingText } from './embedding-text.js';
import { loadDocuments } from './load-documents.js';
import { parseCorpusText } from './parse-corpus-text.js';

export interface DocumentReport {
  document: string;
  articles: number;
  chunks: number;
  maxChunkTokens: number;
}

/**
 * The ingestion pipeline: load -> parse -> chunk -> embed -> store, per document.
 * Knows only interfaces (Embedder, ChunkStore), never Postgres or MiniLM directly.
 */
@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @Inject(EMBEDDER) private readonly embedder: Embedder,
    @Inject(CHUNK_STORE) private readonly store: ChunkStore,
  ) {}

  async ingestDirectory(dir: string): Promise<DocumentReport[]> {
    const documents = await loadDocuments(dir);
    if (documents.length === 0) {
      throw new Error(`No .txt documents found in ${dir}`);
    }

    const reports: DocumentReport[] = [];
    for (const { name, text } of documents) {
      const articles = parseCorpusText(text);
      const chunks = chunkDocument(name, articles, {
        maxTokens: MAX_EMBEDDING_TOKENS,
        maxOverlapTokens: MAX_OVERLAP_TOKENS,
        countTokens: (t) => this.embedder.countTokens(t),
      });

      const embedded = await embedChunks(chunks, this.embedder);
      await this.store.replaceDocument(name, embedded);

      const report = {
        document: name,
        articles: articles.length,
        chunks: chunks.length,
        maxChunkTokens: Math.max(
          ...chunks.map((c) =>
            this.embedder.countTokens(buildEmbeddingText(c)),
          ),
        ),
      };
      // Surfaces the one case the chunker cannot fix (a single over-long sentence).
      if (report.maxChunkTokens > MAX_EMBEDDING_TOKENS) {
        this.logger.warn(
          `${name}: a chunk has ${report.maxChunkTokens} tokens; the model will truncate it`,
        );
      }
      this.logger.log(
        `${name}: ${report.articles} articles -> ${report.chunks} chunks`,
      );
      reports.push(report);
    }

    return reports;
  }
}
