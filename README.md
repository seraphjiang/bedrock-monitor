# bedrock-monitor

Analytics pipeline for AWS Bedrock usage. Ingests invocation logs and CloudWatch metrics into OpenSearch, archives to S3, and ships pre-built dashboards you can import with one command.

## What You Get

**5 dashboards** (importable NDJSON):

| Dashboard | What it shows |
|-----------|---------------|
| **Usage Overview** | Invocations over time, token usage, latency distribution, by-model breakdown, error rate |
| **Model Comparison** | Side-by-side latency, token usage, and errors across models |
| **Cost Analysis** | Total token consumption, usage over time, input/output by model |
| **Audit Trail** | Summary metrics, daily detail table, invocations + errors timeline |
| **Token Efficiency** | Input/output ratio, tokens per invocation, cache hit rate, TTFT trends |

## Quick Start (no AWS account needed)

```bash
git clone https://github.com/seraphjiang/bedrock-monitor.git
cd bedrock-monitor
npm install
docker-compose up -d          # OpenSearch + Dashboards
npm run load-local            # load example data + import dashboards
```

Open **http://localhost:5601** → Dashboards. Example data (168 hourly data points) is included in `example-data/`.

## With Your AWS Account

### 1. Setup

```bash
npm install
export AWS_REGION=us-west-2

# Deploy infra (IAM role, S3 bucket, CloudWatch log group)
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/us-west-2
npx cdk deploy BedrockMonitorStack

# Enable Bedrock invocation logging (one-time)
npm run setup-logging
```

### 2. Pull Data

```bash
# CloudWatch metrics (hourly aggregates, last 7 days)
npm run pull-metrics

# Invocation logs → OpenSearch + S3
npm run ingest
```

### 3. Visualize

```bash
docker-compose up -d
npm run load-local
# → http://localhost:5601
```

## Data Sources

| Source | What | Granularity |
|--------|------|-------------|
| **CloudWatch Metrics** (`AWS/Bedrock`) | Invocations, tokens, latency, errors, TTFT, cache | Hourly aggregates |
| **CloudWatch Logs** (`/aws/bedrock/invocations`) | Full request/response details per invocation | Per-request |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run load-local` | Create indices, load data, import dashboards into local OpenSearch |
| `npm run pull-metrics` | Pull CloudWatch metrics → `data/metrics-hourly.ndjson` |
| `npm run ingest` | Ingest invocation logs → OpenSearch + S3 |
| `npm run generate-test-data` | Make real Bedrock API calls to generate test data |
| `npm run setup-logging` | Enable Bedrock invocation logging (one-time) |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_REGION` | `us-west-2` | AWS region |
| `AWS_ACCOUNT_ID` | — | Your AWS account ID |
| `OPENSEARCH_ENDPOINT` | `http://localhost:9200` | OpenSearch endpoint |
| `S3_BUCKET` | `bedrock-monitor-YOUR_ACCOUNT_ID` | S3 archive bucket |
| `LOOKBACK_HOURS` | `24` | Hours of invocation logs to ingest |
| `LOOKBACK_DAYS` | `7` | Days of metrics to pull |
| `COUNT` | `10` | Number of test invocations to generate |

## Architecture

```
CloudWatch Metrics ──┐
(AWS/Bedrock)        │
                     ├──→ Ingestion (scripts / Lambda) ──┬──→ OpenSearch ──→ Dashboards
CloudWatch Logs ─────┘                                   │
(/aws/bedrock/invocations)                               └──→ S3 (NDJSON archive)
```

**Phase 2** (optional): Lambda-based real-time ingestion via CloudWatch subscription filters + EventBridge scheduled metrics pull. See [docs/HLD.md](docs/HLD.md).

## Project Structure

```
├── dashboards/           # 5 OpenSearch dashboard NDJSON exports
├── example-data/         # Sample metrics for demo (no AWS needed)
├── docs/                 # HLD, roadmap, Phase 3 design
├── infra/                # CDK stack (IAM, S3, CloudWatch)
├── scripts/              # CLI tools
└── src/
    ├── config.ts         # Configuration
    ├── types.ts          # Types + cost estimation
    ├── ingestion/        # CloudWatch → OpenSearch/S3
    ├── lambda/           # Lambda handlers (Phase 2)
    ├── opensearch/       # Index management + bulk indexing
    └── s3/               # NDJSON archival
```

## Importing Dashboards Manually

If you prefer to import dashboards manually instead of `npm run load-local`:

1. Open OpenSearch Dashboards → **Stack Management** → **Saved Objects** → **Import**
2. Import each `.ndjson` file from `dashboards/`

## License

MIT
