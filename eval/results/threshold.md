## Gate 1 threshold sweep — 30 answerable, 10 unanswerable questions

Gate 1 refuses when the best vector similarity is below the threshold, without calling the model.
False refusal = an answerable question refused there (final). Passed = an unanswerable question that reaches the model (gates 2–3 can still refuse it). Current value: 0.35.

| Threshold | False refusals | Unanswerable passed to the model |
|---|---|---|
| 0.20 | 0/30  | 9/10 (q31, q33, q34, q35, q36, q37, q38, q39, q40) |
| 0.25 | 0/30  | 7/10 (q34, q35, q36, q37, q38, q39, q40) |
| 0.30 | 0/30  | 6/10 (q34, q36, q37, q38, q39, q40) |
| 0.35 ← current | 0/30  | 5/10 (q34, q36, q38, q39, q40) |
| 0.40 | 4/30 (q02, q08, q22, q28) | 3/10 (q36, q38, q40) |
| 0.45 | 7/30 (q02, q05, q08, q12, q22, q28, q29) | 1/10 (q40) |
| 0.50 | 11/30 (q02, q04, q05, q08, q11, q12, q15, q18, q22, q28, q29) | 1/10 (q40) |
| 0.55 | 12/30 (q02, q04, q05, q08, q11, q12, q15, q18, q22, q25, q28, q29) | 1/10 (q40) |
| 0.60 | 14/30 (q02, q04, q05, q08, q11, q12, q14, q15, q16, q18, q22, q25, q28, q29) | 0/10  |

### Best vector similarity per question (sorted)

| Id | Answerable | Similarity |
|---|---|---|
| q32 | no | 0.140 |
| q31 | no | 0.214 |
| q33 | no | 0.247 |
| q35 | no | 0.273 |
| q37 | no | 0.329 |
| q28 | yes | 0.366 |
| q02 | yes | 0.367 |
| q39 | no | 0.387 |
| q22 | yes | 0.394 |
| q08 | yes | 0.396 |
| q34 | no | 0.399 |
| q12 | yes | 0.416 |
| q38 | no | 0.416 |
| q36 | no | 0.420 |
| q05 | yes | 0.434 |
| q29 | yes | 0.448 |
| q11 | yes | 0.472 |
| q18 | yes | 0.480 |
| q15 | yes | 0.490 |
| q04 | yes | 0.499 |
| q25 | yes | 0.543 |
| q40 | no | 0.552 |
| q16 | yes | 0.553 |
| q14 | yes | 0.581 |
| q26 | yes | 0.624 |
| q09 | yes | 0.638 |
| q30 | yes | 0.652 |
| q10 | yes | 0.677 |
| q03 | yes | 0.686 |
| q20 | yes | 0.694 |
| q17 | yes | 0.713 |
| q27 | yes | 0.723 |
| q13 | yes | 0.753 |
| q19 | yes | 0.753 |
| q23 | yes | 0.758 |
| q01 | yes | 0.759 |
| q07 | yes | 0.768 |
| q24 | yes | 0.788 |
| q06 | yes | 0.792 |
| q21 | yes | 0.832 |
