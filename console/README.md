# Private benchmark console

Vercel project: [focal-dev-ai/humanizer-benchmark](https://vercel.com/focal-dev-ai/humanizer-benchmark).

This console prepares the next benchmark. Execution is deliberately held: the run endpoint always returns HTTP 423, and no provider clients or benchmark runner are wired into it. Choosing the added humanizer, detector weights, and remaining run instructions comes before implementing execution.

## Model and API settings

The console displays source-linked model and strength profiles for every proposed humanizer and detector. The shared configuration is in `lib/provider-settings.json`; the [API model guide](../docs/api-model-settings.md) records the same public request settings, limits, polling contracts, version handling, and unresolved questions. Documentation verification is separate from live account access, which has not been checked.

The policy is to use the strongest documented model and maximum supported rewriting strength, confirm account access, and stop rather than silently downgrade. HIX uses API v2 with `mode: "Aggressive"`; `Latest` is a separate alternative. The proposed new-run detector panel replaces deprecated Originality Turbo with 5.0 Max. Final panel membership and weights remain pending. Historical reports are unchanged.

## Access

The project uses Vercel Authentication on its Vercel-hosted deployment URLs. Every console page and API additionally requires HTTP Basic authentication with username `owner` and a private, randomly generated owner password. This extra gate is required because Vercel team authentication also admits teammates. This is password-based access, not a per-account identity allowlist.

`BENCHMARK_OWNER_PASSWORD` is provisioned as a Vercel Secret for Production and Preview. Missing or weak configuration denies access. The initial private credential is in `../private/console-owner-access.txt` on the setup computer; it is excluded from Git and deployment uploads. Do not share it. Rotate it in Vercel and redeploy to revoke the existing credential.

## Import API keys

1. Fill a private copy of [.env.example](.env.example), keeping the names listed there.
2. Open [Environment Variables](https://vercel.com/focal-dev-ai/humanizer-benchmark/settings/environment-variables) and use **Import .env**.
3. Select **Production**, store API credentials as **Secret** values, then redeploy the console so the new values are available.
4. The console reports only whether each key is present. It does not reveal values, test API access, spend credits, or start the benchmark.

Credentials are imported into Vercel directly. The console has no upload endpoint and does not persist `.env` files. Do not overwrite `BENCHMARK_OWNER_PASSWORD` when importing provider keys.

The production quality inspectors for factual consistency, naturalness, and stance preservation use OpenRouter (`OPENROUTER_API_KEY`). Syntax integrity is deterministic and needs no external credential.

## Local checks

From this directory, install with `npm ci`, then run `npm test`, `npm run typecheck`, and `npm run build`. Local development also requires a private `BENCHMARK_OWNER_PASSWORD` of at least 32 non-whitespace characters in `.env.local`.

The application is isolated under `console/`. Reports and future results remain under the repository's existing `reports/<dated-report>/` layout. Ryne is omitted from the new-run roster. Previous reports remain intact.
