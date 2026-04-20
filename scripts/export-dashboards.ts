import { readdir } from 'fs/promises';
import { resolve } from 'path';

// This script lists available dashboards for import.
// To import into OpenSearch Dashboards:
//   1. Go to Stack Management → Saved Objects → Import
//   2. Select any .ndjson file from the dashboards/ directory

async function main() {
  const dir = resolve(import.meta.dirname || '.', '../dashboards');
  const files = (await readdir(dir)).filter(f => f.endsWith('.ndjson'));
  console.log('Available dashboards for import:\n');
  for (const f of files) {
    console.log(`  📊 dashboards/${f}`);
  }
  console.log(`\nImport via: OpenSearch Dashboards → Stack Management → Saved Objects → Import`);
}

main().catch(console.error);
