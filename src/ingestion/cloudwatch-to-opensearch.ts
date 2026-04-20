import { fetchLogs } from './cloudwatch-logs.js';
import { ensureIndex, bulkIndex } from '../opensearch/client.js';
import { writeNdjsonToS3 } from '../s3/writer.js';
import { BedrockInvocation } from '../types.js';

const BATCH_SIZE = 100;
const LOOKBACK_HOURS = parseInt(process.env.LOOKBACK_HOURS || '24', 10);

async function main() {
  const endTime = Date.now();
  const startTime = endTime - LOOKBACK_HOURS * 3600 * 1000;
  console.log(`Ingesting Bedrock logs from last ${LOOKBACK_HOURS}h...`);

  await ensureIndex();

  let batch: BedrockInvocation[] = [];
  let total = 0;

  for await (const doc of fetchLogs(startTime, endTime)) {
    batch.push(doc);
    if (batch.length >= BATCH_SIZE) {
      await Promise.all([bulkIndex(batch), writeNdjsonToS3(batch)]);
      total += batch.length;
      batch = [];
    }
  }
  if (batch.length) {
    await Promise.all([bulkIndex(batch), writeNdjsonToS3(batch)]);
    total += batch.length;
  }
  console.log(`Done. Ingested ${total} invocations.`);
}

main().catch(console.error);
