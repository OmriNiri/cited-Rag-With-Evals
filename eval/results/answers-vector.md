## Answers — vector retrieval, llama3.1:8b

Settings: top-k 5, gate-1 threshold 0.35. 40 questions, 0 model errors (excluded below).

| Metric | Result |
|---|---|
| Refusal accuracy (right answer/refuse decision) | 37/40 (93%) |
| Answerable → answered | 28 |
| Answerable → refused | 2 (no_valid_citation 2) |
| Unanswerable → refused | 9 (low_retrieval_score 5, model_insufficient_context 3, no_valid_citation 1) |
| Unanswerable → answered | 1 |
| Citation validity (quotes passing the verbatim check) | 31/33 (94%) |
| Gold citation (answered answerable questions citing a gold article) | 26/28 (93%) |
| Faithfulness (judge): supported / partial / unsupported | 17 / 9 / 3 of 29 |
| Seconds per question: median / max | 8.9 / 19.6 |

### Per question

| Id | Answerable | Outcome | Cited articles (✓ valid, ✗ invalid) | Gold cited | Judge | s |
|---|---|---|---|---|---|---|
| q01 | yes | answered | ✓ Art. 335c | yes | partial | 19.6 |
| q02 | yes | refused: no_valid_citation | ✗ Art. 335c |  |  | 6.7 |
| q03 | yes | answered | ✓ Art. 329a | yes | supported | 8.9 |
| q04 | yes | answered | ✓ Art. 329a | yes | supported | 8.2 |
| q05 | yes | answered | ✓ Art. 328a | **no** | supported | 9.2 |
| q06 | yes | answered | ✓ Art. 336c, ✓ Art. 336c | yes | partial | 14 |
| q07 | yes | answered | ✓ Art. 321c, ✓ Art. 321c | yes | supported | 19.1 |
| q08 | yes | answered | ✓ Art. 330a | yes | partial | 8.2 |
| q09 | yes | answered | ✓ Art. 330a | yes | supported | 9.4 |
| q10 | yes | answered | ✓ Art. 335b | yes | partial | 10.9 |
| q11 | yes | answered | ✓ Art. 335b | yes | supported | 8.9 |
| q12 | yes | answered | ✓ Art. 324b | **no** | partial | 13.4 |
| q13 | yes | answered | ✓ Art. 329f | yes | supported | 10.1 |
| q14 | yes | answered | ✓ Art. 329g | yes | supported | 9 |
| q15 | yes | answered | ✓ Art. 327a | yes | unsupported | 8.1 |
| q16 | yes | answered | ✓ Art. 329c | yes | unsupported | 8.5 |
| q17 | yes | refused: no_valid_citation | ✗ Art. 329b |  |  | 8.8 |
| q18 | yes | answered | ✓ Art. 332 | yes | supported | 8.7 |
| q19 | yes | answered | ✓ Art. 333 | yes | supported | 11.3 |
| q20 | yes | answered | ✓ Art. 336 | yes | partial | 11.3 |
| q21 | yes | answered | ✓ Art. 336a | yes | supported | 8.9 |
| q22 | yes | answered | ✓ Art. 337c | yes | supported | 12.1 |
| q23 | yes | answered | ✓ Art. 337 | yes | supported | 8.9 |
| q24 | yes | answered | ✓ Art. 340 | yes | supported | 11.4 |
| q25 | yes | answered | ✓ Art. 340a | yes | partial | 6.8 |
| q26 | yes | answered | ✓ Art. 339b | yes | partial | 9.9 |
| q27 | yes | answered | ✓ Art. 330b | yes | unsupported | 7 |
| q28 | yes | answered | ✓ Art. 321e | yes | supported | 7.2 |
| q29 | yes | answered | ✓ Art. 329h | yes | supported | 11.1 |
| q30 | yes | answered | ✓ Art. 328 | yes | supported | 9.9 |
| q31 | no | refused: low_retrieval_score |  |  |  | 0.1 |
| q32 | no | refused: low_retrieval_score |  |  |  | 0 |
| q33 | no | refused: low_retrieval_score |  |  |  | 0 |
| q34 | no | refused: model_insufficient_context |  |  |  | 7.8 |
| q35 | no | refused: low_retrieval_score |  |  |  | 0 |
| q36 | no | refused: model_insufficient_context |  |  |  | 4.8 |
| q37 | no | refused: low_retrieval_score |  |  |  | 0 |
| q38 | no | refused: no_valid_citation |  |  |  | 3.6 |
| q39 | no | refused: model_insufficient_context |  |  |  | 5 |
| q40 | no | answered | ✓ Art. 322 |  | partial | 7.3 |
