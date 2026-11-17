# Fixed source inputs — November 16, 2026

This corpus is generated once and reused unchanged for every humanizer. Source generation is the only authorized execution stage. No humanizers or detectors are run by the source-generation script.

The allocation contains 50 English texts: ten per source model, ten per category, five per format, and two per model/category pair. Topics are selected without replacement from the frozen banks using a private random seed. The initial commitment and frozen artifacts were published in Git commit b9bad40 before topic selection or paid generation. The nonce remains private until evaluation closes.

Models match the October benchmark: openai/gpt-6.1-sol, anthropic/claude-sonnet-5.5, google/gemini-4-argon, x-ai/grok-4.7, and deepseek/deepseek-v4.1-flash. Exact returned identifiers, timestamps, prompts and word counts are retained. Provider routing fallbacks are disabled; no substitute source models are used.

Target length is 600–700 words; the fixed acceptance interval is 500–800 whitespace-delimited words. Each prompt may have at most three attempts, preserving all responses privately. Only objective validity failures trigger retries. No detector or quality scores inform input acceptance. Canonical input text is the returned content with outer whitespace stripped, without editing or rephrasing.

- `source-texts.csv`: the 50 accepted inputs, prompts, topics, categories, formats and model identifiers. UTF-8 with BOM; multiline text is CSV-quoted.
- `manifest.json`: CSV hash and per-text SHA-256 hashes for the frozen source corpus.
- `commit.json`: advance seed commitment and hashes of the original allocation, settings, banks, templates and generation script.
- `banks.json`, `templates.json`, `sample-allocation.csv`, `generation-settings.json`: frozen generation design.

The CSV and manifest are created only after all 50 samples pass validation. Raw responses, usage receipts, unsuccessful attempts, resolved prompt preparation and the seed are stored in the ignored private directory. A SHA-256 is calculated over the exact UTF-8 canonical text, not over spreadsheet display formatting. To use these inputs manually, preserve each sample ID and copy its text field exactly.

Generating a source corpus does not enable console execution. Humanization, detector scans, final detector weights and quality evaluation remain separate later stages.

## Completed generation

All 50 inputs were accepted: 34,763 words total, averaging 695.26 words (range 540–795). OpenRouter reported $0.5939614 across 65 attempts, including rejected attempts. `generation-summary.json` records the counts and cost. One DeepSeek sample required a fourth attempt with an 8,192-token cap after the initial three attempts exhausted the 4,096-token cap; the recovery amendment was published before the fourth request. All other frozen generation and acceptance rules were retained.

The source CSV is currently local-only and excluded from Git publication until evaluation closes. The public manifest commits its hash and all input hashes. The selection nonce and raw generation responses remain private. No humanizer or detector calls have been made.
