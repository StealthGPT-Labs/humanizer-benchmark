# Next-run input design

Status: allocation prepared; no source generation or benchmark execution authorized yet. This design replaces the earlier fixed-topic proposal for the next run only. Historical reports remain unchanged.

## Fixed size and balance

Generate exactly 50 accepted English source texts once, then freeze and reuse the identical text for every API and manual humanizer. Do not generate 50 texts per source model or per humanizer.

Use five source providers: OpenAI, Anthropic, Google, xAI, and DeepSeek. Pin one current top-end text model per provider, with exact model identifiers and returned versions verified before generation. These provider names are allocation labels, not verified model selections. Record generation parameters and account for their cost separately from humanizer and detector usage.

Use five equally sized writing categories. Each source model contributes two texts to each category, one in each format:

| Category | Formats | Texts per model | Total |
| --- | --- | ---: | ---: |
| Academic and analytical | Argumentative essay; research explainer | 2 | 10 |
| Science and technology | Technical explainer; science article | 2 | 10 |
| Business and professional | Business case study; workplace report | 2 | 10 |
| Editorial and practical | Opinion article; how-to guide | 2 | 10 |
| Personal and application | Personal statement; reflective essay | 2 | 10 |
| Total | Ten formats | 10 | 50 |

Thus each provider writes 10 texts; each category has 10; each format has five, one per provider. See sample-allocation.csv. Topic and input-text cells intentionally remain empty until the selection and generation stages.

## Topic selection and advance commitment

1. Author and freeze a topic bank with at least ten eligible, distinct topics for each of the ten formats. Include literature/history/social science, health/environment, computing/engineering, business/economics, practical life, and personal experiences as appropriate to the format. Avoid near-duplicate topics across banks. The bank and templates remain human-curated; seeded selection reduces discretion within that frozen design, not all judgment.
2. Freeze the allocation, templates, banks, selection script, model identifiers, generation settings, acceptance rules, and retry rules. Hash each frozen artifact.
3. Generate a private random 32-byte nonce. Before selecting topics or calling any source model, publish a dated commitment containing its SHA-256 plus the frozen artifact hashes. Keep the nonce private until evaluation closes. Do not use a predictable date or cycle name as the seed.
4. Use a frozen deterministic algorithm to hash-rank topics independently within each format, select five without replacement, and deterministically assign those five to the five source providers. Use explicit domain-separated hash inputs and stable tie-breaking; publish the exact algorithm for replay. Do not select topics based on detector scores or anticipated vendor performance.
5. After evaluation closes, release the nonce, banks, templates, resolved prompts, allocation, and selection script so anyone can check the commitment and reproduce topic selection. Preserve existing report publication restrictions unless the owner separately changes them.

The selection script, banks, commitment, and generation runner are still to be built. The allocation CSV alone does not implement commit-and-reveal.

## Input generation and freezing

Target 600–700 words per input; accept 500–800 words using one frozen word-count implementation. This gives a target corpus of 30,000–35,000 input words and a hard accepted maximum of 40,000 words. These length bounds are a proposal for this run and differ from the historical 300–1,000-word bounds.

Prompts request only the finished text, in English, with no humanizing instructions. Supply fictional scenario details for personal writing and fixed facts when precise fact retention is being tested. Do not request fabricated references. Freeze any supplied references or facts alongside the prompt.

Only objective checks may trigger replacement: provider failure, refusal, wrong language, blank/truncated response, length outside the bounds, or duplicate text. Keep the same model and prompt, allow at most two retries, record every attempt, and stop for review if none passes. Never regenerate because the source receives an inconvenient detector or quality score.

Once the first acceptable response is obtained for every slot, store the prompt, topic, source model, raw response, canonical input text, word count, and SHA-256. Freeze a manifest of the 50 input hashes before any humanization. Use the same canonical text bytes for every humanizer, including the four manual tools. Manual outputs need matching sample IDs and recorded settings.

## Run size and budget

At the current estimate of eight API humanizers plus four manual humanizers, collect 600 humanized outputs, 50 per tool. Phrasly remains held and WriteHuman Enhanced remains blocked until separately resolved; changing participation changes this estimate.

At roughly 800 words per humanized output, expect about 480,000 humanized words. Adding about 33,500 baseline input words gives about 513,500 words per detector, or roughly 2.57 million word-scans across the five selected detectors. This is an estimate, not an output cap or spending authorization. Generation variability, refusals, manual output lengths, billing rounding, and retries affect actual usage.

Do not reject or truncate humanizer outputs merely to fit this estimate. Count the delivered texts and check remaining balances before detector submission; stop for review if the frozen spending budget would be exceeded. Originality uses 5.0 only; Turbo and Max are excluded. Detector-strength weights must be fixed before results are examined. Report model/category breakdowns with their sample counts: each model/category cell contains only two inputs.

Execution remains locked pending the owner's remaining instructions.
