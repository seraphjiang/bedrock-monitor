import { fetchMetrics } from '../src/ingestion/cloudwatch-metrics.js';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const LOOKBACK_DAYS = parseInt(process.env.LOOKBACK_DAYS || '7', 10);

async function main() {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - LOOKBACK_DAYS * 86400000);
  console.log(`Pulling Bedrock metrics: ${startTime.toISOString()} → ${endTime.toISOString()}`);

  const hourly = await fetchMetrics(startTime, endTime, 3600);
  console.log(`Got ${hourly.length} hourly data points`);

  const outPath = resolve(import.meta.dirname || '.', '../data/metrics-hourly.ndjson');
  writeFileSync(outPath, hourly.map(d => JSON.stringify(d)).join('\n') + '\n');
  console.log(`Wrote ${outPath}`);

  // Summary
  const totals: Record<string, { invocations: number; inputTokens: number; outputTokens: number; avgLatency: number; count: number }> = {};
  for (const d of hourly) {
    const t = totals[d.modelId] ||= { invocations: 0, inputTokens: 0, outputTokens: 0, avgLatency: 0, count: 0 };
    t.invocations += d.invocations;
    t.inputTokens += d.inputTokens;
    t.outputTokens += d.outputTokens;
    t.avgLatency += d.avgLatencyMs;
    t.count++;
  }
  console.log('\n=== Summary ===');
  for (const [model, t] of Object.entries(totals)) {
    console.log(`${model}:`);
    console.log(`  Invocations: ${t.invocations}`);
    console.log(`  Input tokens: ${t.inputTokens}`);
    console.log(`  Output tokens: ${t.outputTokens}`);
    console.log(`  Avg latency: ${(t.avgLatency / t.count).toFixed(0)}ms`);
  }
}

main().catch(console.error);
