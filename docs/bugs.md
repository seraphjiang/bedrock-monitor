# Bugs

## BUG-001: bedrock-metrics index missing explicit mappings
- **Severity:** High
- **Found:** 2026-04-20 (Task 1.9)
- **Component:** Data ingestion / `scripts/pull-metrics.ts`
- **Description:** When metrics data is bulk-loaded into OpenSearch, no index mapping is created beforehand. OpenSearch auto-maps `modelId` as `text` instead of `keyword`, causing all dashboard aggregations on the metrics index to fail with "Text fields are not optimised for operations that require per-document field data."
- **Workaround:** Manually create the index with explicit mappings before loading data.
- **Fix:** Add an `ensureMetricsIndex()` call (similar to `ensureIndex()` for invocations) in `src/opensearch/client.ts` and call it from `pull-metrics.ts` before bulk loading.
- **Status:** Open

## BUG-002: generate-test-invocations.ts used wrong Nova model IDs and body format
- **Severity:** Medium
- **Found:** 2026-04-20 (Task 1.10)
- **Component:** `scripts/generate-test-invocations.ts`
- **Description:** Original script used bare model IDs (`amazon.nova-pro-v1:0`) which require inference profiles, and used `inputText`/`textGenerationConfig` body format which newer Nova models don't accept.
- **Fix:** Updated to use `us.` inference profile IDs and correct messages-format body. Also added Claude Haiku model.
- **Status:** Fixed (commit 218dd41)

## BUG-003: Ingestion counts non-JSON log messages as failures
- **Severity:** Low
- **Found:** 2026-04-20 (Task 1.10)
- **Component:** `src/ingestion/cloudwatch-to-opensearch.ts`
- **Description:** CloudWatch log group contains non-JSON messages (e.g., "Permissions are correctly set for Amazon Bedrock logs."). The parser returns `null` for these, but they still get passed to `bulkIndex()`, causing `errors: true` in the bulk response. The actual invocation docs index fine.
- **Fix:** Filter out null results before batching.
- **Status:** Open

## BUG-004: Docker Compose dashboards container missing DISABLE_SECURITY_DASHBOARDS_PLUGIN
- **Severity:** Medium
- **Found:** 2026-04-20 (Task 1.9)
- **Component:** `docker-compose.yml`
- **Description:** The dashboards container only sets `DISABLE_SECURITY_PLUGIN=true` but the OpenSearch Dashboards security plugin also needs `DISABLE_SECURITY_DASHBOARDS_PLUGIN=true`. Without it, all API calls return 401 Unauthorized.
- **Fix:** Add `DISABLE_SECURITY_DASHBOARDS_PLUGIN=true` to the dashboards service environment.
- **Status:** Open
