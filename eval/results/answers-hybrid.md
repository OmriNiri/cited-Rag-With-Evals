## Answers — hybrid retrieval, llama3.1:8b

Settings: top-k 5, gate-1 threshold 0.35. 40 questions, 0 model errors (excluded below).

| Metric | Result |
|---|---|
| Refusal accuracy (right answer/refuse decision) | 37/40 (93%) |
| Answerable → answered | 29 |
| Answerable → refused | 1 (no_valid_citation 1) |
| Unanswerable → refused | 8 (low_retrieval_score 5, model_insufficient_context 3) |
| Unanswerable → answered | 2 |
| Citation validity (quotes passing the verbatim check) | 34/35 (97%) |
| Gold citation (answered answerable questions citing a gold article) | 24/29 (83%) |
| Faithfulness (judge): supported / partial / unsupported | 16 / 9 / 6 of 31 |
| Seconds per question: median / max | 7.5 / 14.7 |

### Per question

| Id | Answerable | Outcome | Cited articles (✓ valid, ✗ invalid) | Gold cited | Judge | s |
|---|---|---|---|---|---|---|
| q01 | yes | answered | ✓ Art. 335c | yes | partial | 9.8 |
| q02 | yes | answered | ✓ Art. 335c | yes | partial | 7.6 |
| q03 | yes | answered | ✓ Art. 329a | yes | supported | 7.5 |
| q04 | yes | answered | ✓ Art. 329a | yes | supported | 6.4 |
| q05 | yes | answered | ✓ Art. 328a | **no** | supported | 8.4 |
| q06 | yes | answered | ✓ Art. 336c, ✓ Art. 336c, ✓ Art. 336c | yes | partial | 14.7 |
| q07 | yes | answered | ✓ Art. 321c, ✓ Art. 321c | yes | supported | 14.2 |
| q08 | yes | refused: no_valid_citation | ✗ Art. 330b |  |  | 9.7 |
| q09 | yes | answered | ✓ Art. 330a | yes | supported | 7.3 |
| q10 | yes | answered | ✓ Art. 335b | yes | partial | 10.2 |
| q11 | yes | answered | ✓ Art. 335c | **no** | unsupported | 7.3 |
| q12 | yes | answered | ✓ Art. 324b | **no** | partial | 10.9 |
| q13 | yes | answered | ✓ Art. 329f | yes | supported | 7.8 |
| q14 | yes | answered | ✓ Art. 329g | yes | supported | 6.1 |
| q15 | yes | answered | ✓ Art. 327a | yes | unsupported | 6.9 |
| q16 | yes | answered | ✓ Art. 329c | yes | unsupported | 9.5 |
| q17 | yes | answered | ✓ Art. 329d | yes | supported | 7.4 |
| q18 | yes | answered | ✓ Art. 332 | yes | supported | 7.5 |
| q19 | yes | answered | ✓ Art. 333 | yes | supported | 6.2 |
| q20 | yes | answered | ✓ Art. 336 | yes | unsupported | 9.6 |
| q21 | yes | answered | ✓ Art. 336a | yes | supported | 6.7 |
| q22 | yes | answered | ✓ Art. 337c | yes | supported | 10.7 |
| q23 | yes | answered | ✓ Art. 337 | yes | supported | 6.1 |
| q24 | yes | answered | ✓ Art. 340 | yes | supported | 9.3 |
| q25 | yes | answered | ✓ Art. 340 | **no** | unsupported | 10.1 |
| q26 | yes | answered | ✓ Art. 339b | yes | partial | 7.6 |
| q27 | yes | answered | ✓ Art. 330b | yes | partial | 6 |
| q28 | yes | answered | ✓ Art. 324a | **no** | partial | 8.7 |
| q29 | yes | answered | ✓ Art. 329h | yes | supported | 8 |
| q30 | yes | answered | ✓ Art. 328 | yes | supported | 7.5 |
| q31 | no | refused: low_retrieval_score |  |  |  | 0 |
| q32 | no | refused: low_retrieval_score |  |  |  | 0 |
| q33 | no | refused: low_retrieval_score |  |  |  | 0 |
| q34 | no | refused: model_insufficient_context |  |  |  | 5.4 |
| q35 | no | refused: low_retrieval_score |  |  |  | 0 |
| q36 | no | refused: model_insufficient_context |  |  |  | 5.2 |
| q37 | no | refused: low_retrieval_score |  |  |  | 0 |
| q38 | no | answered | ✓ Art. 329 |  | partial | 5.9 |
| q39 | no | refused: model_insufficient_context |  |  |  | 3.4 |
| q40 | no | answered | ✓ Art. 323b |  | unsupported | 7.7 |
