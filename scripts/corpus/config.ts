// Everything that defines *which* text ends up in the corpus, in one place.

// Pinned to one consolidated version so re-running the script always produces
// the same corpus. Found via fedlex's open-data SPARQL endpoint (see corpus/SOURCES.md).
export const VERSION_DATE = '2026-10-01';

export const SOURCE_URL =
  'https://fedlex.data.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/27/317_321_377/20261001/en/html/fedlex-data-admin-ch-eli-cc-27-317_321_377-20261001-en-html.html';

// HTML id of "Section One: The Individual Employment Contract" (Art. 319–343)
// inside Title Ten of the Code of Obligations.
export const SECTION_ID = 'part_2/tit_10/chap_1';

export const DOCUMENT_TITLE =
  'Swiss Code of Obligations — Title Ten, Section One: The Individual Employment Contract (Art. 319–343)';

export const OUTPUT_PATH = 'corpus/co-individual-employment-contract.txt';
