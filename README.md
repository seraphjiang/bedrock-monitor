# bedrock-monitor

AWS Bedrock usage analytics pipeline. Ingests invocation logs and metrics into OpenSearch and S3, with pre-built dashboards for:

- **Usage Overview** — invocations, tokens, latency by model/user/time
- **Model Comparison** — latency, cost, error rates across models
- **Audit Trail** — per-request log with caller identity, operation, and parameters
- **Cost Analysis** — estimated spend by model, user, and time period

## Prerequisites

- Node.js 18+
- Docker (for local OpenSearch)
- AWS CLI v2 (optional — only needed for pulling live data)

### Quick Start with Example Data (no AWS account needed)

```bash
npm install
docker-compose up -d                    # start OpenSearch + Dashboards
npm run load-local                      # load example data + import dashboards
# Open http://localhost:5601 → Dashboards
```

The `example-data/` directory contains sample Bedrock metrics (168 hourly data points) you can explore immediately.

### With Your Own AWS Account

```bash
export AWS_ACCOUNT_ID=<your-account-id>
aws configure  # or use your preferred credential method
```

## Setup

```bash
npm install
```

### 1. Deploy Infrastructure (first time)

The CDK stack creates the IAM logging role, S3 bucket, and CloudWatch log group:

```bash
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/us-west-2  # first time only
npx cdk deploy BedrockMonitorStack
```

### 2. Enable Bedrock Logging (first time)

```bash
npm run setup-logging
```

This configures Bedrock to write invocation logs to CloudWatch (`/aws/bedrock/invocations`).

### 3. Start Local OpenSearch

For local dashboard development and testing:

```bash
# Docker Compose (preferred — see docker-compose.yml when available)
# Or manually:
docker run -d --name opensearch -p 9200:9200 \
  -e "discovery.type=single-node" -e "DISABLE_SECURITY_PLUGIN=true" \
  opensearchproject/opensearch:2.11.0

docker run -d --name opensearch-dashboards -p 5601:5601 \
  --link opensearch \
  -e "OPENSEARCH_HOSTS=http://opensearch:9200" -e "DISABLE_SECURITY_PLUGIN=true" \
  opensearchproject/opensearch-dashboards:2.11.0
```

Dashboards UI: http://localhost:5601

### 4. Ingest Data

```bash
# Pull CloudWatch metrics (last 7 days by default)
npm run pull-metrics
LOOKBACK_DAYS=30 npm run pull-metrics  # custom range

# Ingest invocation logs into OpenSearch + S3
npm run ingest
LOOKBACK_HOURS=48 npm run ingest  # custom range
```

### 5. Import Dashboards

Import the NDJSON files from `dashboards/` into OpenSearch Dashboards:

1. Open http://localhost:5601
2. Go to **Stack Management → Saved Objects → Import**
3. Import each file from `dashboards/`:
   - `usage-overview.ndjson`
   - `model-comparison.ndjson`
   - `audit-trail.ndjson`
   - `cost-analysis.ndjson`

Or list available dashboards:

```bash
npm run export-dashboards
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run ingest` | Ingest CloudWatch invocation logs → OpenSearch + S3 |
| `npm run pull-metrics` | Pull CloudWatch metrics (hourly aggregates) → `data/` |
| `npm run generate-test-data` | Generate real Bedrock invocations for testing |
| `npm run export-dashboards` | List available dashboard NDJSON files |
| `npm run setup-logging` | Enable Bedrock invocation logging (one-time) |
| `npm run build` | Compile TypeScript |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_REGION` | `us-west-2` | AWS region |
| `OPENSEARCH_ENDPOINT` | `http://localhost:9200` | OpenSearch endpoint |
| `OPENSEARCH_INDEX` | `bedrock-invocations` | Index name |
| `S3_BUCKET` | `bedrock-monitor-YOUR_ACCOUNT_ID` | S3 archive bucket |
| `LOOKBACK_HOURS` | `24` | Hours of logs to ingest |
| `LOOKBACK_DAYS` | `7` | Days of metrics to pull |
| `COUNT` | `10` | Number of test invocations to generate |

## Architecture

```
CloudWatch Logs (/aws/bedrock/invocations)
         │
         ▼
  Ingestion Scripts (src/ingestion/)
         │
    ┌────┴────┐
    ▼         ▼
OpenSearch   S3 (NDJSON archive)
    │
    ▼
OpenSearch Dashboards (4 pre-built dashboards)
```

See [docs/HLD.md](docs/HLD.md) for the full high-level design and [docs/ROADMAP.md](docs/ROADMAP.md) for the project roadmap.

## Project Structure

```
├── dashboards/          # Pre-built OpenSearch dashboard NDJSON exports
├── data/                # Local metric data (NDJSON)
├── docs/                # Design docs, roadmap, ownership
├── infra/               # CDK stack (IAM, S3, CloudWatch)
├── scripts/             # CLI tools (metrics pull, test data, logging setup)
└── src/
    ├── config.ts        # Centralized configuration
    ├── types.ts         # TypeScript types + cost estimation
    ├── ingestion/       # CloudWatch → OpenSearch/S3 pipeline
    ├── opensearch/      # OpenSearch client + index management
    └── s3/              # S3 NDJSON writer
```
