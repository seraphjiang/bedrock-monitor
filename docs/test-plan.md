# Test Plan — Bedrock Monitor

## Scope
End-to-end validation of the Bedrock usage analytics pipeline: data generation, ingestion, OpenSearch indexing, and dashboard rendering.

## Test Environments
- **AWS Account:** YOUR_ACCOUNT_ID (us-west-2)
- **Local OpenSearch:** Docker, opensearch:2.11.0 + dashboards:2.11.0

## Phase 1 Test Scenarios

### T1: Test Invocation Generation
| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| T1.1 | Run generate-test-invocations with COUNT=5 | All 5 succeed across Nova Lite, Nova 2 Lite, Claude Haiku | ✅ Pass |
| T1.2 | Verify logs in CloudWatch within 2 min | Logs appear in /aws/bedrock/invocations | ✅ Pass |
| T1.3 | Claude Haiku uses Messages API format | Request body has anthropic_version + messages array | ✅ Pass |
| T1.4 | Nova models use inference profile IDs | Model IDs prefixed with us. | ✅ Pass |

### T2: Data Ingestion
| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| T2.1 | Ingest CW logs into OpenSearch | Documents indexed in bedrock-invocations | ✅ Pass (9 docs) |
| T2.2 | Pull metrics and load into OpenSearch | 168 hourly data points in bedrock-metrics | ✅ Pass |
| T2.3 | Non-JSON log messages handled gracefully | Skipped without crashing | ⚠ Pass with warnings (BUG-003) |
| T2.4 | Metrics index has correct field types | modelId=keyword, tokens=long, etc. | ⚠ Fail without manual mapping (BUG-001) |

### T3: Dashboard Validation
| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| T3.1 | Import all 5 dashboards | All import successfully (28 objects) | ✅ Pass |
| T3.2 | Index patterns match actual indices | bedrock-invocations, bedrock-metrics | ✅ Pass |
| T3.3 | All visualization fields exist in indices | No missing field references | ✅ Pass |
| T3.4 | Aggregation queries on invocations work | modelId, timestamp, cost aggs succeed | ✅ Pass |
| T3.5 | Aggregation queries on metrics work | modelId, invocations, tokens aggs succeed | ✅ Pass (after BUG-001 fix) |

### T4: Docker Compose
| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| T4.1 | OpenSearch starts and is healthy | GET :9200 returns cluster info | ✅ Pass |
| T4.2 | Dashboards starts and accepts API calls | Saved objects API returns 200 | ⚠ Fail without env fix (BUG-004) |

### T5: CloudTrail Ingestion + Security Audit Dashboard
| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| T5.1 | Pull CloudTrail events (1 day, us-west-2) | Events written to data/cloudtrail-events.ndjson | ✅ Pass (1405 events) |
| T5.2 | Load CloudTrail into bedrock-cloudtrail index | All docs indexed with keyword mappings | ✅ Pass |
| T5.3 | Aggregation: by userIdentity.arn | Groups by caller ARN | ✅ Pass (5 users) |
| T5.4 | Aggregation: by eventName | Groups by API action | ✅ Pass (6 event types) |
| T5.5 | Aggregation: by sourceIPAddress | Groups by source IP | ✅ Pass |
| T5.6 | Aggregation: date_histogram on eventTime | Hourly buckets | ✅ Pass (25 buckets) |
| T5.7 | Import security-audit.ndjson dashboard | 7 objects imported | ✅ Pass |
| T5.8 | CloudTrail pull handles throttling | Retries with backoff | ⚠ Fail (BUG-006) |

## Phase 2 Test Scenarios (Planned)

### T5: Lambda Ingestion Pipeline
| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| T5.1 | CW subscription Lambda processes log events | Docs appear in OpenSearch | 🔲 TODO |
| T5.2 | Scheduled metrics Lambda runs on EventBridge | Metrics index updated hourly | 🔲 TODO |
| T5.3 | S3 archival from Lambda | NDJSON files in S3 bucket | 🔲 TODO |
| T5.4 | Duplicate invocations are deduplicated | requestId used as _id | 🔲 TODO |

## Bugs Found
See [bugs.md](bugs.md) for full details.
