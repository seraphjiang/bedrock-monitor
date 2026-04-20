# Contributing to bedrock-monitor

## Dev Environment

```bash
npm install
# Configure AWS credentials for your account
export AWS_ACCOUNT_ID=YOUR_ACCOUNT_ID
aws configure  # or use your preferred credential method
```

## Workflow

1. Create a feature branch: `git checkout -b feature/my-change`
2. Make changes — all source is TypeScript in `src/` and `scripts/`
3. Build to check types: `npm run build`
4. Test with real data: `COUNT=3 npm run generate-test-data && npm run ingest`
5. Commit and push

## Project Layout

- `src/` — Core library (ingestion, OpenSearch client, S3 writer, types)
- `scripts/` — Runnable CLI tools (invoked via `npm run` scripts)
- `infra/` — CDK infrastructure stack
- `dashboards/` — OpenSearch Dashboards NDJSON exports
- `docs/` — Architecture docs and roadmap

## Adding a New Model

1. Add pricing to `MODEL_PRICING` in `src/types.ts`
2. Add the model ID to `MODELS` in `scripts/generate-test-invocations.ts`
3. If the model uses a different request body format, update `buildRequestBody()` in the same file
4. Add the model to `MODELS` in `src/ingestion/cloudwatch-metrics.ts` for metric collection

## Adding a New Dashboard

1. Build the dashboard in OpenSearch Dashboards (http://localhost:5601)
2. Export via **Stack Management → Saved Objects → Export**
3. Save the NDJSON file to `dashboards/<name>.ndjson`

## Conventions

- TypeScript with ES modules (`"type": "module"` in package.json)
- Use `npx tsx` to run scripts directly (no build step needed for dev)
- Config via environment variables with sensible defaults (see `src/config.ts`)
- NDJSON for all data interchange (OpenSearch bulk, S3 archive, dashboard exports)
