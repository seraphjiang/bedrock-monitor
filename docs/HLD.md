# Bedrock Monitor — High-Level Design

## 1. Overview

Bedrock Monitor ingests AWS Bedrock usage data from multiple sources, normalizes it, streams to OpenSearch and S3, and provides pre-built dashboards for analysis.

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Data Sources                             │
├──────────────────┬──────────────────┬───────────────────────────┤
│ CW Invocation    │ CW Metrics       │ CloudTrail (future)       │
│ Logs (per-req)   │ (aggregated)     │ (API audit)               │
└────────┬─────────┴────────┬─────────┴──────────┬────────────────┘
         │                  │                    │
         ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Ingestion Layer                             │
├──────────────────┬──────────────────┬───────────────────────────┤
│ CW Subscription  │ Scheduled Pull   │ CloudTrail Processor      │
│ Filter (Lambda)  │ (EventBridge +   │ (Lambda, future)          │
│                  │  Lambda)         │                           │
└────────┬─────────┴────────┬─────────┴──────────┬────────────────┘
         │                  │                    │
         ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Normalized Schema                             │
│  BedrockInvocation {                                            │
│    timestamp, requestId, modelId, operation, region,            │
│    identity {arn, accountId},                                   │
│    input {inputTokenCount, inputBodyJson},                      │
│    output {outputTokenCount, outputBodyJson, statusCode},       │
│    latencyMs, errorCode, estimatedCostUsd                       │
│  }                                                              │
│  MetricDataPoint {                                              │
│    timestamp, modelId, invocations, inputTokens, outputTokens,  │
│    avgLatencyMs, serverErrors, cacheReadTokens, ttftMs          │
│  }                                                              │
└────────┬────────────────────────────┬───────────────────────────┘
         │                            │
         ▼                            ▼
┌──────────────────┐    ┌──────────────────────────┐
│   OpenSearch     │    │         S3               │
│   Serverless     │    │   (NDJSON archive)       │
│                  │    │                          │
│ Indices:         │    │ bedrock-logs/            │
│ - bedrock-       │    │   YYYY-MM-DD/            │
│   invocations    │    │     {timestamp}.ndjson   │
│ - bedrock-       │    │ bedrock-metrics/         │
│   metrics        │    │   YYYY-MM-DD/            │
│                  │    │     hourly.ndjson         │
└────────┬─────────┘    └──────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   OpenSearch Dashboards                         │
├──────────────────┬──────────────┬──────────────┬────────────────┤
│ Usage Overview   │ Model        │ Audit Trail  │ Cost Analysis  │
│                  │ Comparison   │              │                │
│ • Invocations/   │ • Latency    │ • Per-request│ • Total spend  │
│   time           │   comparison │   log table  │ • By model     │
│ • Token usage    │ • Cost/model │ • By user    │ • By user      │
│ • Latency dist.  │ • Tokens/req │ • By op type │ • Over time    │
│ • By model pie   │ • Error rate │ • Unique     │ • Forecast     │
│ • Error rate     │   by model   │   users      │   (Phase 3)    │
└──────────────────┴──────────────┴──────────────┴────────────────┘
```

## 3. Data Flow

### Real-time (Phase 2)
1. Bedrock invocation → CW Logs `/aws/bedrock/invocations`
2. CW Subscription Filter triggers Lambda
3. Lambda parses log, enriches with cost estimate, writes to OpenSearch + S3

### Batch (Phase 1 — current)
1. `pull-metrics.ts` queries CW GetMetricData API (hourly aggregates)
2. `cloudwatch-to-opensearch.ts` reads CW Logs, parses, bulk-indexes to OpenSearch + S3

## 4. OpenSearch Index Design

### bedrock-invocations (per-request detail)
| Field | Type | Purpose |
|-------|------|---------|
| timestamp | date | When the invocation occurred |
| requestId | keyword | Unique request ID (dedup key) |
| modelId | keyword | Bedrock model identifier |
| operation | keyword | InvokeModel, Converse, etc. |
| identity.arn | keyword | Caller IAM ARN |
| identity.accountId | keyword | AWS account |
| input.inputTokenCount | integer | Input tokens consumed |
| output.outputTokenCount | integer | Output tokens generated |
| output.statusCode | short | HTTP status |
| latencyMs | float | End-to-end latency |
| errorCode | keyword | Error code if failed |
| estimatedCostUsd | float | Estimated cost based on token pricing |

### bedrock-metrics (hourly aggregates)
| Field | Type | Purpose |
|-------|------|---------|
| timestamp | date | Hour bucket |
| modelId | keyword | Model |
| invocations | integer | Total invocations in hour |
| inputTokens | long | Total input tokens |
| outputTokens | long | Total output tokens |
| avgLatencyMs | float | Average latency |
| serverErrors | integer | 5xx errors |
| cacheReadTokens | long | Prompt cache hits |
| timeToFirstTokenMs | float | Avg TTFT |

## 5. Security

- S3 bucket: SSE-S3 encryption, block all public access, 90-day lifecycle
- OpenSearch Serverless: encryption at rest, VPC access (Phase 2)
- IAM: least-privilege roles — Bedrock→CW/S3, Lambda→OpenSearch/S3
- No prompt/response body stored by default (configurable)
- Invocation log bodies in separate S3 prefix for access control

## 6. Cost Estimation Model

Per-model pricing table in `src/types.ts`. Cost = `(inputTokens/1000) × inputRate + (outputTokens/1000) × outputRate`. Updated manually; future: pull from AWS Price List API.

## 7. Technology Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript (Node.js) |
| Infra | AWS CDK |
| Compute | Lambda (Phase 2), local scripts (Phase 1) |
| Search/Viz | OpenSearch + OpenSearch Dashboards |
| Storage | S3 (NDJSON archive) |
| Scheduling | EventBridge (Phase 2) |
| Monitoring | CloudWatch Metrics/Logs |
