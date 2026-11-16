// Data shapes that flow through ingestion: file -> articles -> chunks.

/** One corpus file, as read from disk. */
export interface SourceDocument {
  name: string; // file name without extension, e.g. "co-individual-employment-contract"
  text: string;
}

/** One law article, parsed from the corpus text format (see corpus/SOURCES.md). */
export interface ParsedArticle {
  section: string; // heading path from the "## " line
  article: string; // "Art. 335c" from the "### " line
  paragraphs: string[]; // each numbered paragraph incl. its indented list items
}

/** One unit of retrieval: what gets embedded, indexed and cited. */
export interface Chunk {
  id: string; // "<document>:art-<number>:<part>", e.g. "co-individual-employment-contract:art-335c:0"
  document: string;
  section: string;
  article: string;
  position: number; // order within the document, 0-based
  text: string; // exact law text (no headings), used for verbatim citation checks
}

/** Counts tokens the way the embedding model does. Injected so the chunker stays pure. */
export type CountTokens = (text: string) => number;
