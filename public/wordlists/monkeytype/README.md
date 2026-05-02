# Monkeytype English wordlists

Mirrored verbatim from
[`monkeytypegame/monkeytype`](https://github.com/monkeytypegame/monkeytype/tree/master/frontend/static/languages),
which is licensed under **GPL-3.0**. If you redistribute flinttype with these
JSON files included, the combined work is subject to GPL-3.0 — review before
shipping.

| File                                | Words   |
|-------------------------------------|---------|
| `english.json`                      | ~200    |
| `english_1k.json`                   | 1 000   |
| `english_5k.json`                   | 5 000   |
| `english_10k.json`                  | 10 000  |
| `english_25k.json`                  | 25 000  |
| `english_450k.json`                 | ~450 000 |
| `english_commonly_misspelled.json`  | curated |
| `english_contractions.json`         | curated |
| `english_doubleletter.json`         | curated |
| `english_medical.json`              | curated |
| `english_old.json`                  | curated |
| `english_shakespearean.json`        | curated |

Each file is a single JSON object: `{ name, noLazyMode, orderedByFrequency, words: string[] }`.
