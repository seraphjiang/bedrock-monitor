# Bedrock Monitor — Roadmap

## Vision
A turnkey analytics platform for AWS Bedrock usage: ingest all invocation data, stream to OpenSearch and S3, and provide importable dashboards for usage analysis, model comparison, cost tracking, and audit.

---

## Phase 1: Foundation (Current Sprint)
> Goal: End-to-end pipeline working with real data on account YOUR_ACCOUNT_ID

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1.1 | Enable Bedrock invocation logging (CW + S3) | sde | ✅ Done |
| 1.2 | CDK stack for IAM role, S3 bucket, CW log group | devops | ✅ Done |
| 1.3 | CloudWatch metrics ingestion (hourly aggregates) | sde | ✅ Done |
| 1.4 | CloudWatch invocation log parser + ingestion | sde | ✅ Done |
| 1.5 | OpenSearch index mapping + bulk indexer | sde | ✅ Done |
| 1.6 | S3 NDJSON archival writer | sde | ✅ Done |
| 1.7 | 4 dashboard NDJSON exports | sde | ✅ Done |
| 1.8 | Local OpenSearch (Docker Compose) for dev/test | devops | ✅ Done |
| 1.9 | Load real metrics into OpenSearch + validate dashboards | test | 🔄 In Progress |
| 1.10 | Generate test invocations for detailed log data | test | ✅ Done |

## Phase 2: Production Pipeline
> Goal: Automated, continuous ingestion with OpenSearch Serverless

| # | Task | Owner | Status |
|---|------|-------|--------|
| 2.1 | OpenSearch Serverless collection (CDK) | devops | ⏭️ Deferred (Docker for PoC) |
| 2.2 | Lambda: CW Logs subscription → OpenSearch | sde | ✅ Done |
| 2.3 | Lambda: CW Logs subscription → S3 (Firehose or direct) | sde | ✅ Done (combined in 2.2) |
| 2.4 | CloudWatch metrics scheduled pull (EventBridge + Lambda) | sde | ✅ Done |
| 2.5 | CDK for Lambdas, EventBridge rules, subscriptions | devops | 🔲 TODO |
| 2.6 | Integration tests: end-to-end pipeline validation | test | 🔲 TODO |

## Phase 3: Advanced Analytics
> Goal: AI-powered insights and advanced dashboards

| # | Task | Owner | Status |
|---|------|-------|--------|
| 3.1 | Prompt/response quality scoring (via Bedrock eval) | aibuilder | 🔲 Designed (docs/PHASE3-DESIGN.md) |
| 3.2 | Anomaly detection on usage patterns | aibuilder | 🔲 Designed (docs/PHASE3-DESIGN.md) |
| 3.3 | Cost forecasting dashboard | aibuilder | 🔄 Starting (linear projection) |
| 3.4 | Token efficiency analysis (input/output ratio trends) | aibuilder | ✅ Done |
| 3.5 | Multi-account support | sde | 🔲 TODO |
| 3.6 | Guardrails event ingestion | sde | 🔲 TODO |

## Phase 4: Polish & Distribution
> Goal: Ready for other developers to adopt

| # | Task | Owner | Status |
|---|------|-------|--------|
| 4.1 | One-command setup script (CDK deploy + logging enable) | devops | 🔲 TODO |
| 4.2 | Dashboard import/export CLI tool | sde | 🔲 TODO |
| 4.3 | Documentation: setup guide, dashboard catalog, architecture | test | 🔲 TODO |
| 4.4 | Sample data generator for demo without AWS account | test | 🔲 TODO |
| 4.5 | CI/CD pipeline (lint, build, test) | devops | 🔲 TODO |
