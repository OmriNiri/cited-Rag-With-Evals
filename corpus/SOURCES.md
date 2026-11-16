# Corpus sources

> **Not legal advice.** This corpus exists only to demonstrate a retrieval and evaluation pipeline. The English text is an unofficial translation with no legal force; only the German, French and Italian versions of Swiss federal law are legally binding.

## `co-individual-employment-contract.txt`

| Field | Value |
|---|---|
| Document | Swiss Code of Obligations (SR 220), Title Ten, Section One: *The Individual Employment Contract*, Art. 319–343 |
| Language | English (translation published by the Swiss Federal Chancellery) |
| Consolidated version | in force as of **2026-10-01** |
| Publisher page | https://www.fedlex.admin.ch/eli/cc/27/317_321_377/en |
| Exact file used | https://fedlex.data.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/27/317_321_377/20261001/en/html/fedlex-data-admin-ch-eli-cc-27-317_321_377-20261001-en-html.html |
| Accessed | 2026-11-16 |
| Contents | 91 articles, ≈11,200 words. Art. 343 and other fully repealed articles/paragraphs are omitted. |

### Reuse terms

Article 5 of the Swiss Federal Act on Copyright (SR 231.1) states that copyright does not protect *"acts, ordinances, international treaties and other official enactments"* (para. 1 a), and *"also does not protect official or legally required collections and translations of the works referred to in paragraph 1"* (para. 2). The text can therefore be reproduced freely. Verified against the English version of the Copyright Act on fedlex, accessed 2026-11-16.

### How the file is produced

The text file is generated, not hand-edited:

```bash
npm run corpus:build
```

The script (`scripts/corpus/`) downloads the exact file above, keeps only Section One, and converts it to plain text:

- `## ...` lines: the heading path inside the law (e.g. `G. End of the employment relationship > II. Open-ended employment relationship > 2. Notice periods > a. In general`)
- `### Art. ...` lines: one per article
- Numbered lines are the article's paragraphs; indented lines are lettered/numbered list items
- Removed: footnote markers, footnotes (legislative history), repealed placeholders (`...`)

### How the file URL was found

Fedlex publishes its metadata as linked open data. The file URL for the English HTML of a given consolidated version comes from its public SPARQL endpoint (https://fedlex.data.admin.ch/sparqlendpoint):

```sparql
PREFIX jolux: <http://data.legilux.public.lu/resource/ontology/jolux#>
SELECT ?date ?file WHERE {
  ?cons jolux:isMemberOf <https://fedlex.data.admin.ch/eli/cc/27/317_321_377> ;
        jolux:dateApplicability ?date ;
        jolux:isRealizedBy ?expr .
  ?expr jolux:language <http://publications.europa.eu/resource/authority/language/ENG> ;
        jolux:isEmbodiedBy ?manif .
  ?manif jolux:userFormat <https://fedlex.data.admin.ch/vocabulary/user-format/html> ;
         jolux:isExemplifiedBy ?file .
} ORDER BY DESC(?date) LIMIT 1
```

To update the corpus to a newer version: run the query, put the new URL and date in `scripts/corpus/config.ts`, run `npm run corpus:build`, and re-run the evaluation (gold references may change).
