// How many candidates the hybrid retriever takes from EACH method before fusing.
// Larger than the final top-k on purpose: a chunk ranked 12th by vector search and
// 3rd by keyword search must be in both candidate lists for RRF to reward it.
// Checked against the eval set in Phase 4.
export const HYBRID_CANDIDATES = 20;
