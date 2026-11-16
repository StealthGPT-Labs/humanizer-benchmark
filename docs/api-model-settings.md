# API model and strength settings

Documentation checked: **November 16, 2026**. These are proposed next-run profiles. The console and its run endpoint remain locked. No humanization or detection requests were made to verify account entitlements.

## Selection and validation policy

- Prefer the provider-documented recommendation for the best humanizing effect. Otherwise use the most aggressive supported rewriting mode. A tone or style is not an aggression level.
- HIX uses API v2 with Latest mode because the vendor describes that technology as its most effective humanization. Aggressive is a separate option for extensive changes.
- Phrasly is on hold until Ultra access arrives. Retain its Ultra/Max target and credentials, but do not run Standard as a substitute.
- Confirm top-tier account access before execution. Never silently fall back to Standard, a legacy model, or a weaker mode.
- Record exact request settings, returned model/version, and vendor-native score meanings. A vendor-managed default is explicitly labeled when no version selector exists.
- Originality 5.0 Max is proposed in place of deprecated Turbo for the new run. Final detector panel and weights are still pending; historical reports stay unchanged.
- Provider-ranked first results are selected before external detector scoring. Do not reroll or choose outputs based on detector results.
- API-key presence does not establish correct authentication, credits, model entitlement, or an implemented runner.

## Provider profiles

### stealth

**Model:** Super — flagship structural humanizer
**Strength/mode:** Super with quality mode; no separate aggression slider
**Documentation:** documented; **account access:** not checked.

**Endpoint:** `POST https://www.stealthgpt.ai/api/stealthify/runs`
**Authentication:** `api-token: <STEALTHGPT_API_KEY>; Content-Type: application/json`

Public request template (placeholders only; not an executable benchmark client):

```json
{
  "text": "<SOURCE_TEXT>",
  "rephrase": true,
  "model": "super",
  "qualityMode": "quality",
  "outputFormat": "text"
}
```

**Completion:** Store runId/statusUrl from 202 Accepted. GET /api/stealthify/runs/<RUN_ID> with the same api-token every 5–15 seconds until completed, failed or cancelled.

**Version record:** Pin model=super and record returned job metadata. No exact resolved build identifier is documented.

**Limits**

- Send only source text, without humanization instructions.
- Use an idempotency-key when creating a job; repeat the same key for transport retries.
- Check API balance/entitlement before a live batch.

**Notes**

- Current official docs identify Super as the newest flagship. Standard and Lite are lower-tier alternatives.
- On Super, qualityMode=quality removes em dashes; it does not select a separate stronger model. On Standard it controls the quality-check path.

**Official sources**

- [StealthGPT models](https://docs.stealthgpt.ai/api-reference/models)
- [Async Writer and Humanizer runs](https://docs.stealthgpt.ai/api-reference/endpoints/stealthify-runs)
- [API authentication](https://docs.stealthgpt.ai/api-reference/authentication)

### phrasly

**Model:** Phrasly Ultra (account enabled; omit model)
**Strength/mode:** Max — strongest documented rewrite
**Documentation:** needs_confirmation; **account access:** not checked.

**Endpoint:** `POST https://business.phrasly.ai/api/v1/humanize`
**Authentication:** `x-api-key: <PHRASLY_API_KEY>; Content-Type: application/json`

Public request template (placeholders only; not an executable benchmark client):

```json
{
  "text": "<SOURCE_TEXT>",
  "mode": "max",
  "stream": false
}
```

**Completion:** Synchronous plain-text response with stream=false; no task polling.

**Version record:** The response does not document a resolved model. Confirm Ultra access and retain vendor evidence; stop if only Standard is available.

**Limits**

- 20–5,000 input words; documented maximum 5 requests/second.
- Ultra requires vendor enablement on the Business account.

**Notes**

- Omit model: account-enabled Ultra is selected automatically. model=latest explicitly forces Standard.
- mode=max is the strongest documented rewrite mode. No separate Ultra capability endpoint or guaranteed resolved-model field was found; confirm access before execution.

**Still to resolve**

- On hold until Phrasly provides Ultra access. Do not run the Standard model or silently substitute it.

**Official sources**

- [Humanize Endpoint Reference](https://business.phrasly.ai/docs/humanization-api)
- [Authentication and rate limits](https://business.phrasly.ai/docs/authentication)
- [MCP server and free account status tool](https://business.phrasly.ai/docs/mcp)

### rephrasy

**Model:** Superstealth
**Strength/mode:** Highest bypass model; no separate aggression parameter documented
**Documentation:** documented; **account access:** not checked.

**Endpoint:** `POST https://v2-humanizer.rephrasy.ai/api/`
**Authentication:** `Authorization: Bearer <REPHRASY_API_KEY>; Content-Type: application/json`

Public request template (placeholders only; not an executable benchmark client):

```json
{
  "text": "<SOURCE_TEXT>",
  "model": "superstealth",
  "input_format": "text",
  "words": true,
  "costs": true
}
```

**Completion:** Synchronous JSON; output contains the rewritten text. Allow at least a 120-second client timeout.

**Version record:** Pin model=superstealth. No separate resolved build identifier is documented; record the requested selector and any returned metadata.

**Limits**

- Maximum 12,000 plain-text characters.
- Typical processing 10–60 seconds; recommended timeout at least 120 seconds.

**Notes**

- Superstealth is the newest/strongest model in the official October 20 release. v4 is a faster alternative.
- input_format, words and costs request parsing/billing metadata; they are not strength controls.

**Official sources**

- [AI Humanizer API - Developer Integration](https://www.rephrasy.ai/api-solution)
- [Introducing Superstealth, and Retiring v3](https://www.rephrasy.ai/blog/introducing-superstealth-and-retiring-v3)

### undetectableai

**Model:** Undetectable — new proxy model
**Strength/mode:** No separate strength control documented for this endpoint
**Documentation:** needs_confirmation; **account access:** not checked.

**Endpoint:** `POST https://human.undetectable.ai/humanize`
**Authentication:** `API-Key: <UNDETECTABLE_API_KEY>; Content-Type: application/json`

Public request template (placeholders only; not an executable benchmark client):

```json
{
  "text": "<SOURCE_TEXT>",
  "humanizer": "undetectable"
}
```

**Completion:** The new proxy returns output directly as JSON; no task polling. Do not mix legacy /submit parameters into this endpoint.

**Version record:** Record response.humanizer. No exact model build identifier or separate aggression selector is documented.

**Limits**

- New proxy requires at least 250 characters.
- Proxy-specific maximum and rate limits need confirmation.

**Notes**

- New proxy request uses only text and humanizer. The docs do not rank its aggression against legacy v11sr.
- Legacy alternative is POST https://humanize.undetectable.ai/submit with content, model=v11sr, strength=More Human, readability=University and purpose=General Writing. It is a separate contract; do not mix fields or silently fall back.

**Still to resolve**

- Confirm new proxy-model access and top-end preference. Official docs call it new but do not provide an explicit aggression ranking or version identifier.

**Official sources**

- [Humanizer Proxy](https://help.undetectable.ai/en/article/humanizer-proxy-1vmpd9d/)
- [Undetectable AI APIs](https://undetectable.ai/develop)
- [Humanization API v2 (legacy endpoint)](https://help.undetectable.ai/en/article/humanization-api-v2-p28b2n/)
- [Legacy Humanization API OpenAPI](https://humanize.undetectable.ai/openapi.json)

### hix

**Model:** API v2
**Strength/mode:** Latest — vendor-recommended most effective humanization
**Documentation:** documented; **account access:** not checked.

**Endpoint:** `POST https://hixbypass.com/api/hixbypass/v2/submit`
**Authentication:** `api-key header; application/json body`

Public request template (placeholders only; not an executable benchmark client):

```json
{
  "input": "<SOURCE_TEXT>",
  "mode": "Latest"
}
```

**Completion:** GET https://hixbypass.com/api/hixbypass/v2/obtain?task_id=<TASK_ID>; inspect data.task_status and data.subtask_status. Stop on completed/failed; interval is not documented.

**Version record:** Pin API v2 and the chosen mode. Record the retrieval mode and full job metadata; no resolved model build is documented.

**Limits**

- 50–2,000 input words.
- API v2 charges 3 credits per output word; separate API allowance applies.

**Notes**

- API v2 selects the current API generation. mode=Latest follows the vendor description of its newest, most effective humanization technology.
- Aggressive is a mutually exclusive alternative focused on extensive changes. The documented best-effect recommendation takes priority over a literal mode name; this is vendor guidance, not a measured benchmark result.

**Official sources**

- [HIX Bypass API Documentation 2.0.0 — official OpenAPI](https://cdn.hixbypass.com/prod/public/api-docs/api-docs-v2.yaml)
- [HIX Bypass API Documentation](https://hixbypass.com/api-docs)
- [HIX Bypass API — API limits and account requirements](https://hixbypass.com/developer)

### humbot

**Model:** API v2
**Strength/mode:** Advanced
**Documentation:** documented; **account access:** not checked.

**Endpoint:** `POST https://humbot.ai/api/humbot/v2/create`
**Authentication:** `api-key header; application/json body`

Public request template (placeholders only; not an executable benchmark client):

```json
{
  "input": "<SOURCE_TEXT>",
  "model_type": "Advanced"
}
```

**Completion:** GET https://humbot.ai/api/humbot/v2/retrieve?task_id=<TASK_ID>; inspect data.task_status and data.subtask_status. Interval is not documented.

**Version record:** Pin API v2 and model_type=Advanced; record the mode in the completed retrieval response.

**Limits**

- 50–2,000 input words; separate API allowance applies.
- Do not infer a credit multiplier from example response counts.

**Notes**

- Exact request enum is model_type: Quick, Enhanced, Advanced; body also includes input. Retrieval reports the selected setting as mode.
- Advanced is documented as the most comprehensive/sophisticated choice; v2 is the current API engine generation. No numeric strength setting documented.
- OpenAPI examples and response property names differ for error fields; adapters should use the schema and preserve raw responses privately.
- The schema does not explicitly state a v2 credit multiplier; do not infer it from example word counts. No provider request tested.

**Official sources**

- [Humbot AI Humanizer API Docs 2.0.0 — official OpenAPI](https://cdn.humbot.ai/web-cdn/bypass/public/banana/api-document-v2.yaml)
- [Humbot AI Humanizer API Docs](https://humbot.ai/api-documentation)
- [Humbot AI Humanizer API — limits and account requirements](https://humbot.ai/ai-humanizer-api)

### bypassgpt

**Model:** API v2
**Strength/mode:** Enhanced
**Documentation:** documented; **account access:** not checked.

**Endpoint:** `POST https://www.bypassgpt.ai/api/bypassgpt/v2/generate`
**Authentication:** `api-key header; application/json body`

Public request template (placeholders only; not an executable benchmark client):

```json
{
  "input": "<SOURCE_TEXT>",
  "model_type": "Enhanced"
}
```

**Completion:** GET https://www.bypassgpt.ai/api/bypassgpt/v2/retrieval?task_id=<TASK_ID>; inspect data.finished and data.bypass_status (init/ok/failed/exception).

**Version record:** Pin API v2 and model_type=Enhanced; record the completed job mode and metadata.

**Limits**

- 50–2,000 input words; separate API allowance applies.
- Do not infer a credit multiplier from example response counts.

**Notes**

- Exact request enum is model_type: Fast, Creative, Enhanced; body also includes input.
- Enhanced is documented for comprehensive rewriting against advanced detectors. API generation v2 is separate from the Enhanced setting; no numeric strength setting documented.
- The schema does not explicitly state a v2 credit multiplier; do not infer it from example word counts. No provider request tested.

**Official sources**

- [BypassGPT API Document 2.0.0 — official OpenAPI](https://cdn.bypassgpt.ai/web-cdn/bypass/public/strawberry/api-document-v2.yaml)
- [BypassGPT API Reference](https://www.bypassgpt.ai/api-document)
- [BypassGPT API — limits and account requirements](https://bypassgpt.ai/api-overview)

### writehuman

**Model:** Enhanced (Premium required)
**Strength/mode:** Enhanced model; no numeric aggression control documented
**Documentation:** needs_confirmation; **account access:** not checked.

**Endpoint:** `POST https://api.writehuman.ai/v1/humanize`
**Authentication:** `Authorization: Bearer <WRITEHUMAN_API_KEY>; Content-Type: application/json`

Public request template (placeholders only; not an executable benchmark client):

```json
{
  "text": "<SOURCE_TEXT>",
  "enhanced": true
}
```

**Completion:** Synchronous JSON; use results[0], the provider-ranked first result. Verify model is enhanced.

**Version record:** Require response.model=enhanced. Record all returned alternatives privately; select the vendor-ranked first result before detector scoring.

**Limits**

- Premium API plan required for Enhanced.
- Documented body accepts 30–100,000 characters; plan word caps also apply.
- Premium plan caps vary from 4,000 to 6,000 words per request; verify the actual account.

**Notes**

- Enhanced defaults false even on Premium: send enhanced=true. Response model must equal enhanced for the requested configuration.
- Premium returns three ranked alternatives and internal human-likeness scores. Selection of provider's first result should be fixed before external detector scoring.
- Optional tone is a style, not aggression; omit it. Allowed tones: professional, academic, blog, casual, creative, scientific, technical. Do not send general from marketing snippets.
- No resolved model version is documented beyond standard/enhanced. Premium marketing describes detection-aware processing and priority processing.

**Still to resolve**

- Confirm a Premium API plan and Enhanced availability. Reject enhanced_requires_premium or enhanced_unavailable rather than silently using Standard.

**Official sources**

- [AI Humanizer API Documentation — REST API Reference v1.3](https://writehuman.ai/api/docs)
- [AI Humanizer API plans and Enhanced features](https://writehuman.ai/api)

### grubby

**Model:** Grubby MCP; model/version not published
**Strength/mode:** Academic candidate; maximum-aggression setting unverified
**Documentation:** needs_confirmation; **account access:** not checked.

**Endpoint:** `MCP https://grubby.ai/api/mcp`
**Authentication:** `Public setup documents Grubby sign-in and approval; static MCP API-key header/scheme is not documented.`

Public request template (placeholders only; not an executable benchmark client):

```json
{}
```

**Completion:** Long jobs use get_humanize_result. Exact job argument names and terminal statuses must be obtained from the MCP schema.

**Version record:** Obtain authenticated tools/list and confirm the exact model/mode arguments before a run. Public docs do not expose a build version.

**Limits**

- English only in the reviewed public documentation.
- Published per-request word caps vary by plan (300–2,500); verify MCP account limits.

**Notes**

- Publicly documented tools: humanize_text, check_quota, get_humanize_result. The empty request example is intentional: exact arguments are not confirmed.
- Academic is the default style; GPTZero emphasizes expressive prose and ZeroGPT is lighter. These are not a published maximum-aggression ranking.

**Still to resolve**

- Confirm how the supplied GRUBBY_MCP_API_KEY authenticates; official public setup describes sign-in rather than an extra key.
- Obtain the MCP tools/list schema before choosing exact argument names/enums, transport headers, and job-result identifiers.
- Public docs describe target/style modes rather than a ranked aggression scale; Academic is the default, not proven strongest overall.

**Official sources**

- [Humanize AI text inside Claude and ChatGPT — official MCP setup and modes](https://grubby.ai/mcp)
- [Grubby AI at a glance — official modes and language](https://grubby.ai/reviews)
- [Official Grubby product guide — per-request plan caps](https://grubby.ai/blog/carterpcs-ai-humanizer)

### rewriteai

**Model:** API default; Advanced/Ultra API selection not verified
**Strength/mode:** Advanced Humanization Engine and Ultra-human output advertised on paid plans; selector undocumented
**Documentation:** needs_confirmation; **account access:** not checked.

**Endpoint:** `POST https://rewriteai.com/api/v1/humanize`
**Authentication:** `Authorization: Bearer <REWRITEAI_API_KEY>; Content-Type: application/json`

Public request template (placeholders only; not an executable benchmark client):

```json
{
  "text": "<SOURCE_TEXT>"
}
```

**Completion:** Synchronous JSON in the official example; output is results[0].text. No polling contract is published.

**Version record:** Record all response metadata. No model/version selector or resolved model field is documented.

**Limits**

- Published plan caps range from 300 to 3,000 words; API-specific account cap needs confirmation.
- No numeric rate limit is published in the reviewed API page.

**Notes**

- Official API example exposes only text. Paid-plan marketing mentions Advanced/Ultra, but no corresponding API selector is documented. Do not label the default as strongest.

**Still to resolve**

- Official API example documents only text, not a model/mode/strength parameter. Do not invent mode:'advanced' or claim default is strongest.
- Confirm account API entitlement and per-request cap. The previous benchmark's 300-word API cap is not enough evidence for current account limits.
- Choose the first returned result consistently; do not select variants after looking at detector results.

**Official sources**

- [Humanizer API — RewriteAI](https://rewriteai.com/humanizer-api)
- [How to Rewrite AI Text to Sound Human](https://rewriteai.com/blog/rewrite-ai-text-to-human)

### pangram

**Model:** Pangram 4 series; completed response reports minor version
**Strength/mode:** Current publicly documented numbered text series
**Documentation:** documented; **account access:** not checked.

**Endpoint:** `POST https://text.external-api.pangram.com/task`
**Authentication:** `x-api-key: <PANGRAM_API_KEY>; Content-Type: application/json`

Public request template (placeholders only; not an executable benchmark client):

```json
{
  "text": "<output_text>",
  "model": "pangram-4",
  "public_dashboard_link": false
}
```

**Completion:** GET https://text.external-api.pangram.com/task/<TASK_ID> using task_id; terminal stages STAGE_SUCCESS or STAGE_FAILED. Use bounded backoff as runner policy.

**Version record:** Request pangram-4; record response.version on every completed task. A numbered series does not pin the minor version.

**Limits**

- Check the entitlement-aware GET /models catalog before a live run.
- No numeric text cap was established from the reviewed endpoint docs.

**Notes**

- fraction_human is text share, not document confidence. Preserve prediction_short and returned version.
- The default selector floats; pangram-4 explicitly selects the documented numbered series.

**Still to resolve**

- Account model entitlement/availability not checked. Official GET /models catalog is entitlement aware; no API calls made.
- Series selector does not pin minor version. Record every completed response.version and do not mix versions silently.

**Official sources**

- [REST API Quickstart](https://docs.pangram.com/quickstart-rest)
- [AI Detection](https://docs.pangram.com/api-reference/ai-detection)
- [Models](https://docs.pangram.com/api-reference/models)

### gptzero

**Model:** GPTZero 5.0b — 2026-11-04-base
**Strength/mode:** Latest publicly released English detector as checked
**Documentation:** documented; **account access:** not checked.

**Endpoint:** `POST https://api.gptzero.me/v2/predict/text`
**Authentication:** `x-api-key: <GPTZERO_API_KEY>; Content-Type: application/json`

Public request template (placeholders only; not an executable benchmark client):

```json
{
  "document": "<output_text>",
  "modelVersion": "2026-11-04-base"
}
```

**Completion:** Synchronous text scan; no polling required.

**Version record:** Pin modelVersion=2026-11-04-base, the released 5.0b model at this check. Record response.version and neatVersion.

**Limits**

- Maximum 150,000 characters; oversized text is rejected.
- English target; non-English input may use a different multilingual model.

**Notes**

- 5.0b was released November 4, 2026. Use current class_probabilities and predicted_class; older generated-probability fields are deprecated.
- The human class score is classification probability, not a fraction of human-written words.

**Still to resolve**

- Actual key availability and returned version not verified. Do not use unreleased entries merely because a catalog includes them.
- A latest-at-run policy may omit modelVersion, but pinning the latest released version at the cutoff is more reproducible.

**Official sources**

- [GPTZero Release Notes: AI Detection Model & API Updates](https://gptzero.me/news/ai-detection-model-api-updates)
- [Detect AI in text — current endpoint schema](https://docs.gptzero.me/api-reference/POST/v2/predict/text.md)
- [List model versions](https://docs.gptzero.me/api-reference/GET/v2/model-versions/ai-scan.md)
- [Quickstart](https://docs.gptzero.me/quickstart)

### originality5max

**Model:** Originality.ai 5.0 Max
**Strength/mode:** Vendor's highest-accuracy current detector
**Documentation:** documented; **account access:** not checked.

**Endpoint:** `POST https://api.originality.ai/api/v3/scan`
**Authentication:** `X-OAI-API-KEY: <ORIGINALITY_API_KEY>; Content-Type: application/json`

Public request template (placeholders only; not an executable benchmark client):

```json
{
  "title": "Benchmark <sample_id>",
  "content": "<output_text>",
  "check_ai": true,
  "check_plagiarism": false,
  "check_facts": false,
  "check_readability": false,
  "check_grammar": false,
  "storeScan": false,
  "aiModelVersion": "model-5.0-max"
}
```

**Completion:** Same synchronous V3 scan endpoint; no separate model-specific polling documented.

**Version record:** Pin aiModelVersion=model-5.0-max; record results.ai.model, prediction_label, and ai_assisted_percent.

**Limits**

- Minimum 50 words; documented limit 500 requests/minute.
- Max uses 10 credits per 100 words and takes longer than standard 5.0.

**Notes**

- Proposed next-run replacement for deprecated Turbo. Historical reports are unchanged. Final detector panel and weights are still pending.
- 5.0 and Max report AI-involvement text share, not Turbo-style document confidence; preserve native labels and separate model results.

**Still to resolve**

- Proposed next-run replacement for deprecated Turbo; panel and strength weights still need finalization.
- Account API entitlement/credit balance not checked; no scan made.

**Official sources**

- [Scan — aiModelVersion selector and response schema](https://docs.originality.ai/scan.md?plain=1)
- [Current model selectors: model-5.0 and model-5.0-max](https://docs.originality.ai/originality-ai-api-v1.md?plain=1)
- [Introducing Originality.ai 5.0 and 5.0 Max](https://originality.ai/blog/introducing-originality-5-0-and-max)

### originality5

**Model:** Originality.ai 5.0
**Strength/mode:** Current standard model; 5.0 Max is the highest-accuracy option
**Documentation:** documented; **account access:** not checked.

**Endpoint:** `POST https://api.originality.ai/api/v3/scan`
**Authentication:** `X-OAI-API-KEY: <ORIGINALITY_API_KEY>; Content-Type: application/json`

Public request template (placeholders only; not an executable benchmark client):

```json
{
  "title": "Benchmark <sample_id>",
  "content": "<output_text>",
  "check_ai": true,
  "check_plagiarism": false,
  "check_facts": false,
  "check_readability": false,
  "check_grammar": false,
  "storeScan": false,
  "aiModelVersion": "model-5.0"
}
```

**Completion:** POST scan returns results in documented200 response. GET scan results is available for stored scans; no async task loop documented for this text scan.

**Version record:** Pin aiModelVersion=model-5.0; record results.ai.model, prediction_label, and ai_assisted_percent.

**Limits**

- Minimum 50 words; documented limit 500 requests/minute.
- Standard 5.0 uses 1 credit per 100 words.

**Notes**

- Do not average this AI-involvement percentage as if it were a Turbo/GPTZero classification confidence.
- Official category explanations: Likely Original under10%AI, Mixed10–80%, LikelyAI81–100%; record actual native prediction_label rather than reconstructing ambiguous boundary rounding.
- storeScan:false is a privacy-oriented runner choice; resulting scan cannot be fetched later from vendor history.

**Still to resolve**

- API documentation requires an Enterprise-level subscription. Actual key entitlements were not checked.
- Keep native classification separately from the historical >50% human-score bypass threshold; they are different metrics.

**Official sources**

- [Scan — V3 base URL and endpoint](https://docs.originality.ai/scan)
- [Scan — request and response schema](https://docs.originality.ai/scan.md?plain=1)
- [Originality.ai V3 API model list, authentication and rate limits](https://docs.originality.ai/originality-ai-api-v1.md?plain=1)
- [Introducing Originality.ai 5.0 and 5.0 Max](https://originality.ai/blog/introducing-originality-5-0-and-max)
- [Minimum Word Counts For Scans](https://help.originality.ai/en/article/minimum-word-counts-for-scans-1lyfqtb)

### zerogpt

**Model:** Vendor-managed default — no public model/version selector
**Strength/mode:** No selectable detector strength documented
**Documentation:** documented; **account access:** not checked.

**Endpoint:** `POST https://api.zerogpt.com/api/detect/detectText`
**Authentication:** `ApiKey: <ZEROGPT_API_KEY>; Content-Type: application/json`

Public request template (placeholders only; not an executable benchmark client):

```json
{
  "input_text": "<output_text>"
}
```

**Completion:** Documented endpoint returns a completed detection result synchronously.

**Version record:** No public selector or resolved model version is documented. Label vendor-managed default, never invent a version.

**Limits**

- Verify the account IP whitelist and Vercel egress compatibility.
- Text caps and rate limits need account confirmation.

**Notes**

- The official direct-key endpoint documents ApiKey and input_text. Dashboard JWT methods are a separate contract.
- data.fakePercentage is AI text share and data.feedback is the vendor assessment. Model build is undisclosed.

**Still to resolve**

- Official endpoint documentation does not expose a model/version parameter or resolved model version; do not invent a newest model identifier.
- Pricing setup instructions require configuring an IP whitelist; Vercel egress compatibility/account whitelist not checked.

**Official sources**

- [ZeroGPT API Business Plans and vendor documentation links](https://www.zerogpt.com/pricing)
- [Detect AI in your text — ZeroGPT Business API](https://app.theneo.io/olive-works-llc/zerogpt-docs/detect/detect-text.md?plain=1)
- [ZeroGPT Business API OpenAPI](https://api.zerogpt.com/openapi.json)

### winston

**Model:** Winston AI 5.2
**Strength/mode:** Latest and most accurate text version in current official endpoint docs
**Documentation:** documented; **account access:** not checked.

**Endpoint:** `POST https://api.gowinston.ai/v2/ai-content-detection`
**Authentication:** `Authorization: Bearer <WINSTON_API_KEY>; Content-Type: application/json`

Public request template (placeholders only; not an executable benchmark client):

```json
{
  "text": "<output_text>",
  "version": "5.2",
  "sentences": true,
  "language": "en"
}
```

**Completion:** Synchronous POST response; no text-task polling documented.

**Version record:** Pin version=5.2 at this documentation cutoff; record response.version rather than assuming latest stayed fixed.

**Limits**

- 300–150,000 characters; at least 600 recommended for reliable analysis.
- One credit per processed word.

**Notes**

- The current endpoint explicitly supports version 5.2. The response has a human score and version, but no documented categorical verdict.
- Pinning the current release is reproducible; latest floats. A binary bypass threshold remains a benchmark decision.

**Still to resolve**

- Actual returned version and account key not checked. Store response.version on every scan.
- Using version:'latest' would follow future updates; for reproducibility pin5.2 as current cutoff and verify response.version.

**Official sources**

- [AI text detection — version5.2 option and response.version](https://docs.gowinston.ai/api-reference/v2/ai-content-detection/post)
- [Changelog —5.2.0 released October29,2026](https://docs.gowinston.ai/api-reference/changelog)
