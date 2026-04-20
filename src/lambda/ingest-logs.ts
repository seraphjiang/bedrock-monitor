import { gunzipSync } from 'zlib';
import { parseLogEvent } from '../ingestion/cloudwatch-logs.js';
import { ensureIndex, bulkIndex } from '../opensearch/client.js';
import { writeNdjsonToS3 } from '../s3/writer.js';
import { BedrockInvocation } from '../types.js';

interface CWLogsEvent {
  awslogs: { data: string };
}

interface CWLogsData {
  logEvents: Array<{ id: string; timestamp: number; message: string }>;
}

let indexReady = false;

export async function handler(event: CWLogsEvent) {
  const payload = Buffer.from(event.awslogs.data, 'base64');
  const { logEvents } = JSON.parse(gunzipSync(payload).toString()) as CWLogsData;

  const docs: BedrockInvocation[] = [];
  for (const le of logEvents) {
    const parsed = parseLogEvent(le.message);
    if (parsed) docs.push(parsed);
  }

  if (!docs.length) return { processed: 0 };

  if (!indexReady) {
    await ensureIndex();
    indexReady = true;
  }

  await Promise.all([bulkIndex(docs), writeNdjsonToS3(docs)]);
  return { processed: docs.length };
}
