import { Client } from '@opensearch-project/opensearch';
import { fetchMetrics } from '../ingestion/cloudwatch-metrics.js';
import { writeNdjsonToS3 } from '../s3/writer.js';
import { config } from '../config.js';

const METRICS_INDEX = 'bedrock-metrics';
const client = new Client({ node: config.opensearch.endpoint });

export async function handler() {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 2 * 3600000); // last 2 hours (overlap for safety)

  const dataPoints = await fetchMetrics(startTime, endTime, 3600);
  if (!dataPoints.length) return { processed: 0 };

  // Ensure index
  const exists = await client.indices.exists({ index: METRICS_INDEX });
  if (!exists.body) {
    await client.indices.create({
      index: METRICS_INDEX,
      body: {
        mappings: {
          properties: {
            timestamp: { type: 'date' },
            modelId: { type: 'keyword' },
            invocations: { type: 'integer' },
            inputTokens: { type: 'long' },
            outputTokens: { type: 'long' },
            avgLatencyMs: { type: 'float' },
            serverErrors: { type: 'integer' },
            cacheReadTokens: { type: 'long' },
            cacheWriteTokens: { type: 'long' },
            timeToFirstTokenMs: { type: 'float' },
          },
        },
      },
    });
  }

  // Bulk index with composite ID for dedup
  const body = dataPoints.flatMap(dp => [
    { index: { _index: METRICS_INDEX, _id: `${dp.modelId}-${dp.timestamp}` } },
    dp,
  ]);
  await client.bulk({ body, refresh: true });

  // Archive to S3
  await writeNdjsonToS3(
    dataPoints as any,
    `bedrock-metrics/${endTime.toISOString().slice(0, 10)}/${endTime.toISOString()}.ndjson`,
  );

  return { processed: dataPoints.length };
}
