import { Client } from '@opensearch-project/opensearch';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const OPENSEARCH = process.env.OPENSEARCH_ENDPOINT || 'http://localhost:9200';
const DASHBOARDS = process.env.DASHBOARDS_ENDPOINT || 'http://localhost:5601';
const METRICS_INDEX = 'bedrock-metrics';
const CLOUDTRAIL_INDEX = 'bedrock-cloudtrail';
const GUARDRAILS_INDEX = 'bedrock-guardrails';
const COSTS_INDEX = 'bedrock-costs';

const client = new Client({ node: OPENSEARCH });

const CLOUDTRAIL_MAPPING = {
  mappings: {
    properties: {
      eventTime: { type: 'date' },
      eventName: { type: 'keyword' },
      eventSource: { type: 'keyword' },
      awsRegion: { type: 'keyword' },
      sourceIPAddress: { type: 'keyword' },
      userAgent: { type: 'text' },
      'userIdentity.type': { type: 'keyword' },
      'userIdentity.arn': { type: 'keyword' },
      'userIdentity.accountId': { type: 'keyword' },
      errorCode: { type: 'keyword' },
      errorMessage: { type: 'text' },
    },
  },
};

const GUARDRAILS_MAPPING = {
  mappings: {
    properties: {
      timestamp: { type: 'date' },
      guardrailId: { type: 'keyword' },
      region: { type: 'keyword' },
      intervened: { type: 'integer' },
      blocked: { type: 'integer' },
    },
  },
};

const COSTS_MAPPING = {
  mappings: {
    properties: {
      timestamp: { type: 'date' },
      service: { type: 'keyword' },
      usageType: { type: 'keyword' },
      amountUsd: { type: 'float' },
      unit: { type: 'keyword' },
    },
  },
};

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

const INVOCATIONS_MAPPING = {
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

async function createIndices() {
  for (const [index, mapping] of [
    [METRICS_INDEX, METRICS_MAPPING],
    ['bedrock-invocations', INVOCATIONS_MAPPING],
    [CLOUDTRAIL_INDEX, CLOUDTRAIL_MAPPING],
    [GUARDRAILS_INDEX, GUARDRAILS_MAPPING],
    [COSTS_INDEX, COSTS_MAPPING],
  ] as const) {
    const { body: exists } = await client.indices.exists({ index });
    if (exists) {
      console.log(`Index ${index} already exists, deleting...`);
      await client.indices.delete({ index });
    }
    await client.indices.create({ index, body: mapping });
    console.log(`Created index: ${index}`);
  }
}

async function loadMetrics() {
  let data: string;
  try {
    data = readFileSync(join(import.meta.dirname, '..', 'data', 'metrics-hourly.ndjson'), 'utf-8');
  } catch {
    data = readFileSync(join(import.meta.dirname, '..', 'example-data', 'metrics-hourly.ndjson'), 'utf-8');
  }
  const lines = data.trim().split('\n').filter(Boolean);
  const body = lines.flatMap((line, i) => [
    { index: { _index: METRICS_INDEX, _id: String(i) } },
    JSON.parse(line),
  ]);
  const { body: resp } = await client.bulk({ body, refresh: true });
  console.log(`Loaded ${lines.length} metrics docs, errors: ${resp.errors}`);
}

async function loadCloudTrail() {
  let data: string;
  try {
    data = readFileSync(join(import.meta.dirname, '..', 'data', 'cloudtrail-events.ndjson'), 'utf-8');
  } catch {
    console.log('No cloudtrail-events.ndjson found, skipping');
    return;
  }
  const lines = data.trim().split('\n').filter(Boolean);
  const body = lines.flatMap((line, i) => [
    { index: { _index: CLOUDTRAIL_INDEX, _id: String(i) } },
    JSON.parse(line),
  ]);
  const { body: resp } = await client.bulk({ body, refresh: true });
  console.log(`Loaded ${lines.length} cloudtrail docs, errors: ${resp.errors}`);
}

async function loadNdjson(file: string, index: string) {
  let data: string;
  try {
    data = readFileSync(join(import.meta.dirname, '..', 'data', file), 'utf-8');
  } catch {
    console.log(`No ${file} found, skipping`);
    return;
  }
  const lines = data.trim().split('\n').filter(Boolean);
  if (!lines.length) { console.log(`${file} is empty, skipping`); return; }
  const body = lines.flatMap((line, i) => [
    { index: { _index: index, _id: String(i) } },
    JSON.parse(line),
  ]);
  const { body: resp } = await client.bulk({ body, refresh: true });
  console.log(`Loaded ${lines.length} ${index} docs, errors: ${resp.errors}`);
}

async function importDashboards() {
  const dir = join(import.meta.dirname, '..', 'dashboards');
  for (const file of readdirSync(dir).filter(f => f.endsWith('.ndjson'))) {
    const ndjson = readFileSync(join(dir, file), 'utf-8');
    const form = new FormData();
    form.append('file', new File([ndjson], file, { type: 'application/x-ndjson' }));
    const res = await fetch(`${DASHBOARDS}/api/saved_objects/_import?overwrite=true`, {
      method: 'POST',
      headers: { 'osd-xsrf': 'true' },
      body: form,
    });
    const json = await res.json() as { success: boolean; successCount?: number };
    console.log(`Imported ${file}: success=${json.success}, count=${json.successCount ?? 0}`);
  }
}

async function main() {
  // Wait for OpenSearch to be ready
  for (let i = 0; i < 30; i++) {
    try {
      await client.cluster.health({});
      break;
    } catch {
      console.log('Waiting for OpenSearch...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  await createIndices();
  await loadMetrics();
  await loadCloudTrail();
  await loadNdjson('guardrails-metrics.ndjson', GUARDRAILS_INDEX);
  await loadNdjson('costs-daily.ndjson', COSTS_INDEX);
  await importDashboards();
  console.log('\nDone! Dashboards at http://localhost:5601');
}

main().catch(console.error);
