import { fetchCosts } from '../src/ingestion/cost-explorer.js';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const LOOKBACK_DAYS = parseInt(process.env.LOOKBACK_DAYS || '30', 10);

async function main() {
  const end = new Date();
  const start = new Date(end.getTime() - LOOKBACK_DAYS * 86400000);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  console.log(`Pulling Bedrock costs: ${startStr} → ${endStr}`);

  const costs = await fetchCosts(startStr, endStr);
  console.log(`Got ${costs.length} cost line items`);

  const outPath = resolve(import.meta.dirname || '.', '../data/costs-daily.ndjson');
  writeFileSync(outPath, costs.map(d => JSON.stringify(d)).join('\n') + '\n');
  console.log(`Wrote ${outPath}`);

  // Summary
  let total = 0;
  const byType: Record<string, number> = {};
  for (const c of costs) {
    total += c.amountUsd;
    byType[c.usageType] = (byType[c.usageType] || 0) + c.amountUsd;
  }
  console.log(`\n=== Summary (${LOOKBACK_DAYS}d) ===`);
  console.log(`Total: $${total.toFixed(4)}`);
  for (const [type, amt] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: $${amt.toFixed(4)}`);
  }
}

main().catch(console.error);
