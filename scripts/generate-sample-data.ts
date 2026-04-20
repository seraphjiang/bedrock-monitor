import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const outDir = resolve(import.meta.dirname, '..', 'data');
mkdirSync(outDir, { recursive: true });

// Guardrails: ~50 hourly data points across 3 guardrail IDs
const guardrailIds = ['gr-content-filter-01', 'gr-pii-detector-02', 'gr-topic-block-03'];
const guardrails: string[] = [];
const now = Date.now();
for (let h = 0; h < 48; h++) {
  const ts = new Date(now - h * 3600000).toISOString();
  for (const id of guardrailIds) {
    if (Math.random() > 0.65) continue; // sparse data
    guardrails.push(JSON.stringify({
      timestamp: ts,
      guardrailId: id,
      region: 'us-west-2',
      intervened: Math.floor(Math.random() * 12),
      blocked: Math.floor(Math.random() * 4),
    }));
  }
}
writeFileSync(resolve(outDir, 'guardrails-metrics-sample.ndjson'), guardrails.join('\n') + '\n');
console.log(`Wrote ${guardrails.length} guardrails data points`);

// Costs: ~30 daily data points across usage types
const usageTypes = [
  'USE2-Anthropic-Claude-Haiku-Tokens',
  'USE2-Anthropic-Claude-Sonnet-Tokens',
  'USE2-Amazon-Nova-Lite-Tokens',
  'USE2-Amazon-Nova-Pro-Tokens',
];
const costs: string[] = [];
for (let d = 0; d < 30; d++) {
  const ts = new Date(now - d * 86400000).toISOString().slice(0, 10);
  for (const ut of usageTypes) {
    const base = ut.includes('Haiku') ? 0.08 : ut.includes('Sonnet') ? 0.25 : 0.03;
    costs.push(JSON.stringify({
      timestamp: ts,
      service: 'Amazon Bedrock',
      usageType: ut,
      amountUsd: +(base * (0.5 + Math.random())).toFixed(4),
      unit: 'USD',
    }));
  }
}
writeFileSync(resolve(outDir, 'costs-sample.ndjson'), costs.join('\n') + '\n');
console.log(`Wrote ${costs.length} cost data points`);
