## Retrieval — 30 answerable questions

hit@k = share of questions with a gold article in the top k. MRR = mean of 1/rank of the first gold hit (0 if not in the top 10).

| Retriever | Questions | hit@1 | hit@3 | hit@5 | hit@10 | MRR@10 |
|---|---|---|---|---|---|---|
| vector | all (30) | 18/30 (60%) | 27/30 (90%) | 29/30 (97%) | 30/30 (100%) | 0.754 |
| vector | casual (15) | 6/15 (40%) | 13/15 (87%) | 14/15 (93%) | 15/15 (100%) | 0.635 |
| vector | legal (15) | 12/15 (80%) | 14/15 (93%) | 15/15 (100%) | 15/15 (100%) | 0.872 |
| keyword | all (30) | 15/30 (50%) | 19/30 (63%) | 20/30 (67%) | 22/30 (73%) | 0.566 |
| keyword | casual (15) | 2/15 (13%) | 4/15 (27%) | 5/15 (33%) | 7/15 (47%) | 0.209 |
| keyword | legal (15) | 13/15 (87%) | 15/15 (100%) | 15/15 (100%) | 15/15 (100%) | 0.922 |
| hybrid | all (30) | 16/30 (53%) | 23/30 (77%) | 25/30 (83%) | 27/30 (90%) | 0.670 |
| hybrid | casual (15) | 4/15 (27%) | 9/15 (60%) | 10/15 (67%) | 12/15 (80%) | 0.456 |
| hybrid | legal (15) | 12/15 (80%) | 14/15 (93%) | 15/15 (100%) | 15/15 (100%) | 0.883 |

### Per question — rank of the first gold article (– = not in the top 10)

| Id | Wording | Gold | vector | keyword | hybrid |
|---|---|---|---|---|---|
| q01 | legal | Art. 335c | 2 | 2 | 2 |
| q02 | casual | Art. 335c | 2 | 1 | 1 |
| q03 | legal | Art. 329a | 1 | 1 | 1 |
| q04 | casual | Art. 329a | 2 | 3 | 2 |
| q05 | casual | Art. 336c | 9 | – | – |
| q06 | legal | Art. 336c | 4 | 3 | 4 |
| q07 | legal | Art. 321c | 1 | 1 | 1 |
| q08 | casual | Art. 330a | 4 | – | – |
| q09 | legal | Art. 330a | 1 | 1 | 1 |
| q10 | legal | Art. 335b | 1 | 1 | 1 |
| q11 | casual | Art. 335b | 2 | – | 5 |
| q12 | casual | Art. 324a | 2 | – | 7 |
| q13 | legal | Art. 329f | 1 | 1 | 1 |
| q14 | casual | Art. 329g | 1 | 8 | 3 |
| q15 | casual | Art. 327a | 1 | 10 | 2 |
| q16 | casual | Art. 329c | 3 | 4 | 2 |
| q17 | legal | Art. 329d | 1 | 1 | 1 |
| q18 | casual | Art. 332 | 1 | 1 | 1 |
| q19 | legal | Art. 333 | 1 | 1 | 1 |
| q20 | legal | Art. 336 | 3 | 1 | 2 |
| q21 | legal | Art. 336a | 1 | 1 | 1 |
| q22 | casual | Art. 337c | 1 | – | 2 |
| q23 | legal | Art. 337 | 1 | 1 | 1 |
| q24 | legal | Art. 340 | 1 | 1 | 1 |
| q25 | casual | Art. 340a | 2 | – | 6 |
| q26 | casual | Art. 339b, Art. 339c | 1 | – | 1 |
| q27 | legal | Art. 330b | 1 | 1 | 1 |
| q28 | casual | Art. 321e | 3 | – | – |
| q29 | casual | Art. 329h | 1 | 3 | 1 |
| q30 | legal | Art. 328 | 1 | 1 | 1 |
