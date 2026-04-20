# bedrock-monitor

AWS Bedrock usage analytics pipeline. Ingests Bedrock invocation logs into OpenSearch and S3 for dashboards covering:

- **Usage analysis** — invocations, tokens, latency by model/user/time
- **Model comparison** — performance, cost, error rates across models
- **Audit** — who called what, when, with what parameters
- **Cost tracking** — estimated spend by model, user, application

## Prerequisites

Switch AWS credentials to account **544277935543** (us-west-2):

```bash
# Option A: SSO
aws sso login --profile bedrock-monitor
export AWS_PROFILE=bedrock-monitor

# Option B: Environment variables
export AWS_ACCESS_KEY_ID=<your-key>
export AWS_SECRET_ACCESS_KEY=<your-secret>
export AWS_REGION=us-west-2

# Verify
aws sts get-caller-identity  # should show account 544277935543
```

## Infrastructure Setup

Deploy the CDK stack (creates IAM role, S3 bucket, CloudWatch log group):

```bash
npm install
npx cdk bootstrap aws://544277935543/us-west-2  # first time only
npx cdk deploy BedrockMonitorStack
```

### Local OpenSearch (for dashboards)

```bash
docker run -d --name opensearch -p 9200:9200 -p 5601:5601 \
  -e "discovery.type=single-node" -e "DISABLE_SECURITY_PLUGIN=true" \
  opensearchproject/opensearch:2.11.0

docker run -d --name opensearch-dashboards -p 5601:5601 \
  --link opensearch \
  -e "OPENSEARCH_HOSTS=http://opensearch:9200" -e "DISABLE_SECURITY_PLUGIN=true" \
  opensearchproject/opensearch-dashboards:2.11.0
```

## Quick Start

```bash
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
