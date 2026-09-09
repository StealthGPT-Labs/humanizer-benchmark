# StealthGPT Humanizer Benchmark

This repository publishes dated benchmarks of [StealthGPT](https://stealthgpt.ai/) outputs. AI-detection performance and writing quality are measured separately.

## AI detectors

Every output is evaluated through the APIs of:

- [Pangram](https://www.pangram.com/)
- [GPTZero](https://gptzero.me/)
- [Winston AI](https://gowinston.ai/)
- [Originality.ai](https://originality.ai/)

Each report records the API model setting used, such as `v4`, `latest`, or `turbo`. When a provider returns the version behind `latest`, that version is also recorded.

## Detector metrics

| Term | Definition |
|---|---|
| Human score | The detector’s human score on a 0–100% scale: 0% means AI and 100% means human. |
| Mean human score | The average human score across every output in the sample. |
| Median human score | The middle human score after ordering all scores. |
| Strict bypass | The detector’s overall verdict was human. Mixed verdicts do not count. |

Human scores are vendor-specific and are not directly comparable across detectors.

## Quality benchmarks

| Benchmark | Definition |
|---|---|
| Factual consistency | Key claims, numbers, citations, and named entities remain accurate and correctly attributed. |
| Completeness | Important ideas and data from the source are retained. |
| Naturalness | Wording is fluent and free of awkward or clunky phrasing. |
| Syntax integrity | Sentences are grammatically complete and free of disruptive run-ons or punctuation errors. |
| Stance preservation | The source’s position, tone, and intent are not reversed or distorted. |

A quality pass means no issue remained in that dimension after automated inspection, correction, and re-inspection. Internal models, prompts, scoring logic, and thresholds are not disclosed.

## Benchmark rules

- Every detector receives the same output.
- Detector models and resolved versions are recorded for each run.
- Detector and quality results are reported separately.
- Each report states its sample size, language, selection method, Humanizer model, and date.

## Reports

- [September 8, 2026 — Humanizer comparison](reports/2026-09-08-humanizer-comparison/)
- [September 7, 2026 — StealthGPT Super](reports/2026-09-07-stealthgpt-super/)

## Published data

Each report includes anonymized detector scores, aggregates, model versions, and quality benchmark results.

Source text, output text, internal IDs, raw API responses, and internal quality-test logic are withheld. Text-score pairs are excluded to prevent adversarial reuse.
