import { fetchCloudTrailEvents } from '../src/ingestion/cloudtrail.js';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const LOOKBACK_DAYS = parseInt(process.env.LOOKBACK_DAYS || '7', 10);
const REGIONS = (process.env.AWS_REGIONS || 'us-west-2,us-east-1').split(',').map(r => r.trim());

async function main() {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - LOOKBACK_DAYS * 86400000);
  console.log(`Pulling CloudTrail Bedrock events: ${startTime.toISOString()} → ${endTime.toISOString()}`);
  console.log(`Regions: ${REGIONS.join(', ')}`);

  const events = [];
  for await (const event of fetchCloudTrailEvents(REGIONS, startTime, endTime)) {
    events.push(event);
  }

  const outDir = resolve(import.meta.dirname || '.', '../data');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, 'cloudtrail-events.ndjson');
  writeFileSync(outPath, events.map(e => JSON.stringify(e)).join('\n') + '\n');
  console.log(`\nWrote ${events.length} events to ${outPath}`);

  // Summary
  const byName: Record<string, number> = {};
  for (const e of events) byName[e.eventName] = (byName[e.eventName] || 0) + 1;
  console.log('\n=== Event Summary ===');
  for (const [name, count] of Object.entries(byName).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${name}: ${count}`);
  }
}

main().catch(console.error);
