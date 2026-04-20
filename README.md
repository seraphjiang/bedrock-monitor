# bedrock-monitor

AWS Bedrock usage analytics pipeline. Ingests Bedrock invocation logs into OpenSearch and S3 for dashboards covering:

- **Usage analysis** — invocations, tokens, latency by model/user/time
- **Model comparison** — performance, cost, error rates across models
- **Audit** — who called what, when, with what parameters
- **Cost tracking** — estimated spend by model, user, application

## Quick Start

```bash
npm install

# 1. Enable Bedrock invocation logging (one-time)
npm run setup-logging

# 2. Generate test invocations (optional — creates real Bedrock calls)
npm run generate-test-data

# 3. Ingest logs into OpenSearch
npm run ingest

# 4. Export dashboards as NDJSON for import into OpenSearch Dashboards
npm run export-dashboards
```

## Dashboards

Pre-built NDJSON files in `dashboards/` — import into OpenSearch Dashboards:

- `usage-overview.ndjson` — invocations, tokens, latency over time
- `model-comparison.ndjson` — side-by-side model performance
- `audit-trail.ndjson` — detailed invocation log with filters
- `cost-analysis.ndjson` — estimated cost breakdown

## Architecture

```
CloudWatch Logs (Bedrock invocation logs)
    ↓
Ingestion script (src/ingestion/)
    ↓
┌─────────────┬──────────────┐
│ OpenSearch   │ S3 (archive) │
│ (dashboards) │ (raw NDJSON) │
└─────────────┴──────────────┘
```
