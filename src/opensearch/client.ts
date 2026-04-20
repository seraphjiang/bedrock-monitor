import { Client } from '@opensearch-project/opensearch';
import { config } from '../config.js';
import { BedrockInvocation } from '../types.js';

const client = new Client({ node: config.opensearch.endpoint });

const MAPPING = {
  mappings: {
    properties: {
      timestamp: { type: 'date' },
      requestId: { type: 'keyword' },
      modelId: { type: 'keyword' },
      operation: { type: 'keyword' },
      region: { type: 'keyword' },
      'identity.arn': { type: 'keyword' },
      'identity.accountId': { type: 'keyword' },
      'input.inputTokenCount': { type: 'integer' },
      'output.outputTokenCount': { type: 'integer' },
      'output.statusCode': { type: 'short' },
      latencyMs: { type: 'float' },
      errorCode: { type: 'keyword' },
      estimatedCostUsd: { type: 'float' },
    },
  },
};

export async function ensureIndex() {
  const exists = await client.indices.exists({ index: config.opensearch.index });
  if (!exists.body) {
    await client.indices.create({ index: config.opensearch.index, body: MAPPING });
    console.log(`Created index: ${config.opensearch.index}`);
  }
}

const METRICS_MAPPING = {
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
};

export async function ensureMetricsIndex(index = 'bedrock-metrics') {
  const exists = await client.indices.exists({ index });
  if (!exists.body) {
    await client.indices.create({ index, body: METRICS_MAPPING });
    console.log(`Created index: ${index}`);
  }
}

export async function bulkIndex(docs: BedrockInvocation[]) {
  if (!docs.length) return;
  const body = docs.flatMap(doc => [
    { index: { _index: config.opensearch.index, _id: doc.requestId } },
    doc,
  ]);
  const resp = await client.bulk({ body, refresh: true });
  console.log(`Indexed ${docs.length} docs, errors: ${resp.body.errors}`);
}
