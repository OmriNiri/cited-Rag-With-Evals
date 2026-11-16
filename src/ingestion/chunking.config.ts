// Chunking limits, in tokens of the embedding model (see DECISIONS D3, D7).

// all-MiniLM-L6-v2 reads at most 256 tokens; anything longer is silently cut off.
// The limit applies to the whole embedding input (section + article + text).
// Token counts already include the model's [CLS]/[SEP] tokens; 250 leaves a small safety margin.
export const MAX_EMBEDDING_TOKENS = 250;

// When an article is split, the next chunk repeats the previous paragraph so a
// sentence that depends on it keeps its context — but only if that paragraph is short.
export const MAX_OVERLAP_TOKENS = 60;
