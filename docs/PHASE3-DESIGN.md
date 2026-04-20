# Phase 3: Advanced Analytics — Design

> Based on 7-day sample: 168 hourly points, ~9,800 invocations, model `us.anthropic.claude-haiku-4-5-20251001-v1:0`, avg latency 1,333ms, 5.6M input tokens, 219K output tokens.

---

## 3.1 Prompt/Response Quality Scoring

### Approach
Use Bedrock's model evaluation (Bedrock Eval Jobs) to score a sample of invocations on relevance, coherence, and helpfulness. Store scores alongside invocation data in OpenSearch.

### Design
1. **Sampling** — Score 5–10% of invocations (configurable). Select via reservoir sampling on the ingestion Lambda to avoid bias.
2. **Eval pipeline** — New Lambda triggered by SQS queue. For each sampled invocation:
   - Retrieve prompt/response from S3 (stored in `bedrock-logs/` prefix)
   - Call `CreateEvaluationJob` with a judge model (e.g., Claude Sonnet) using built-in metrics: `Relevance`, `Coherence`, `Fluency`
   - Parse scores, write to `bedrock-quality` OpenSearch index
3. **Schema** — New index `bedrock-quality`:
   | Field | Type | Purpose |
   |-------|------|---------|
   | requestId | keyword | Links to bedrock-invocations |
   | relevanceScore | float | 0–1 relevance rating |
   | coherenceScore | float | 0–1 coherence rating |
   | fluencyScore | float | 0–1 fluency rating |
   | compositeScore | float | Weighted average |
   | judgeModelId | keyword | Which model scored it |
4. **Dashboard** — Quality score distribution over time, score by model, low-score alert list.

### Cost estimate
At 5% sampling of 9,800 invocations/week = ~490 eval calls. Using Haiku as judge: ~$0.50/week.

### Open questions
- Should we use Bedrock Eval Jobs (batch, cheaper) or inline Converse calls (real-time, more expensive)?
- Do we need human-in-the-loop calibration for the first batch?

---

## 3.2 Anomaly Detection

### Metrics to monitor
| Metric | Source | Why |
|--------|--------|-----|
| Invocations/hour | bedrock-metrics.invocations | Detect traffic spikes or drops |
| Avg latency | bedrock-metrics.avgLatencyMs | Detect degradation |
| Error rate | bedrock-metrics.serverErrors / invocations | Detect outages |
| Input tokens/invocation | inputTokens / invocations | Detect prompt bloat |
| Cost/hour | Derived from token counts + pricing | Detect runaway spend |

### Algorithm
**OpenSearch Anomaly Detection plugin** — uses Random Cut Forest (RCF), already built into OpenSearch. No custom ML needed.

1. **Detector config** — One detector per metric above, 1-hour interval matching our data granularity. RCF handles seasonality (daily patterns) automatically.
2. **Training** — RCF needs ~256 data points for stable baselines. With hourly data, that's ~11 days. Our 7-day sample is close; recommend 2 weeks of data before enabling alerts.
3. **Alerting** — OpenSearch Alerting plugin triggers on anomaly grade > 0.7:
   - SNS notification → email/Slack
   - Write anomaly events to `bedrock-anomalies` index for dashboard display

### Why RCF over alternatives
- **Built-in** — No external ML infra needed, runs inside OpenSearch
- **Streaming** — Updates model incrementally, no batch retraining
- **Unsupervised** — No labeled data required
- **Seasonal** — Handles daily/weekly patterns in Bedrock usage

### Dashboard additions
- Anomaly overlay on existing usage/latency charts
- Anomaly event log table with severity and affected metric

---

## 3.3 Cost Forecasting

### Approach: Linear projection (Phase 3a) → ML-based (Phase 3b)

#### Phase 3a — Linear projection
Simple and interpretable. Good enough for stable workloads.

1. **Method** — 7-day rolling average of daily cost, projected forward 30 days. Calculated as a scripted field or Vega visualization in OpenSearch Dashboards.
2. **Formula** — `forecast_daily = avg(cost_last_7d)`, `forecast_30d = forecast_daily × 30`
3. **Display** — Single metric panel showing "Projected 30-day cost" + line chart with historical cost and dashed projection line.
4. **Accuracy** — With our sample data: daily cost ≈ $X (derived from 5.6M input + 219K output tokens at Haiku pricing). Linear projection works when usage is steady.

#### Phase 3b — ML-based (future)
For workloads with growth trends or seasonality.

1. **Method** — OpenSearch ML Commons plugin with `RCFSummarize` or external SageMaker Canvas for auto-ML time series forecasting.
2. **Features** — Day-of-week, hour-of-day, invocation count trend, token growth rate.
3. **When to upgrade** — When linear projection error exceeds 20% over 2 consecutive weeks (measured by comparing forecast vs actual).

### Recommendation
Start with Phase 3a (linear). It's zero-infra, works in OpenSearch Dashboards natively, and our current data shows stable usage patterns. Add ML forecasting only if usage patterns become non-linear.

---

## Implementation Priority

| Task | Effort | Dependency | Recommended order |
|------|--------|------------|-------------------|
| 3.3a Cost forecast (linear) | S | Existing data | 1st — immediate value, no new infra |
| 3.2 Anomaly detection | M | 2 weeks of data | 2nd — enable detectors now, alerts after training |
| 3.1 Quality scoring | L | S3 log storage + eval pipeline | 3rd — needs prompt/response bodies in S3 |
| 3.3b Cost forecast (ML) | L | Stable anomaly detection | 4th — only if linear isn't sufficient |
