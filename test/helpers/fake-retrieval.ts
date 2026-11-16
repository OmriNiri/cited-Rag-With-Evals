import type {
  RetrievalMode,
  Retriever,
} from '../../src/retrieval/retriever.js';
import type {
  SearchHit,
  SearchOptions,
} from '../../src/retrieval/search.types.js';

/** A search hit where only the id matters. */
export function fakeHit(id: string, score = 0): SearchHit {
  return {
    id,
    document: 'd',
    section: 's',
    article: 'a',
    text: `text of ${id}`,
    score,
  };
}

/** Returns a fixed ranking and remembers how it was called. */
export class FakeRetriever implements Retriever {
  readonly calls: { question: string; options: SearchOptions }[] = [];

  constructor(
    readonly mode: RetrievalMode,
    private readonly ranking: string[],
  ) {}

  retrieve(question: string, options: SearchOptions): Promise<SearchHit[]> {
    this.calls.push({ question, options });
    return Promise.resolve(
      this.ranking.slice(0, options.limit).map((id) => fakeHit(id, 0.5)),
    );
  }
}
