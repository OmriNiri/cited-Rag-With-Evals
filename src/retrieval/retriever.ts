import type { SearchHit, SearchOptions } from './search.types.js';

// One interface, three strategies. Answering (Phase 3) and the eval (Phase 4)
// only know this interface, so they can compare or swap strategies freely.

export type RetrievalMode = 'vector' | 'keyword' | 'hybrid';

export const RETRIEVAL_MODES: readonly RetrievalMode[] = [
  'vector',
  'keyword',
  'hybrid',
];

export interface Retriever {
  readonly mode: RetrievalMode;
  /** The `options.limit` best chunks for a question, best first. */
  retrieve(question: string, options: SearchOptions): Promise<SearchHit[]>;
}

/** All retrievers by name, e.g. retrievers.hybrid. Injected with @Inject(RETRIEVERS). */
export type Retrievers = Record<RetrievalMode, Retriever>;

export const RETRIEVERS = Symbol('RETRIEVERS');
