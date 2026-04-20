import { CloudWatchClient, GetMetricDataCommand, ListMetricsCommand } from '@aws-sdk/client-cloudwatch';
import { config } from '../config.js';

export interface MetricDataPoint {
  timestamp: string;
  modelId: string;
  region: string;
  invocations: number;
  inputTokens: number;
  outputTokens: number;
  avgLatencyMs: number;
  serverErrors: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  timeToFirstTokenMs: number;
  throttles: number;
}

async function discoverModels(cw: CloudWatchClient): Promise<string[]> {
  const resp = await cw.send(new ListMetricsCommand({ Namespace: 'AWS/Bedrock', MetricName: 'Invocations' }));
  const models = new Set<string>();
  for (const m of resp.Metrics ?? []) {
    const modelId = m.Dimensions?.find(d => d.Name === 'ModelId')?.Value;
    if (modelId) models.add(modelId);
  }
  return [...models];
}

async function fetchForRegion(region: string, startTime: Date, endTime: Date, periodSec: number): Promise<MetricDataPoint[]> {
  const cw = new CloudWatchClient({ region });
  const models = await discoverModels(cw);
  if (!models.length) return [];
  console.log(`  ${region}: found ${models.length} models: ${models.join(', ')}`);

  const results: MetricDataPoint[] = [];
  for (const modelId of models) {
    const metricQueries = [
      { id: 'invocations', stat: 'Sum', metric: 'Invocations' },
      { id: 'inputTokens', stat: 'Sum', metric: 'InputTokenCount' },
      { id: 'outputTokens', stat: 'Sum', metric: 'OutputTokenCount' },
      { id: 'latency', stat: 'Average', metric: 'InvocationLatency' },
      { id: 'errors', stat: 'Sum', metric: 'InvocationServerErrors' },
      { id: 'cacheRead', stat: 'Sum', metric: 'CacheReadInputTokenCount' },
      { id: 'cacheWrite', stat: 'Sum', metric: 'CacheWriteInputTokenCount' },
      { id: 'ttft', stat: 'Average', metric: 'TimeToFirstToken' },
      { id: 'throttles', stat: 'Sum', metric: 'InvocationThrottles' },
    ].map(q => ({
      Id: q.id,
      MetricStat: {
        Metric: { Namespace: 'AWS/Bedrock', MetricName: q.metric, Dimensions: [{ Name: 'ModelId', Value: modelId }] },
        Period: periodSec,
        Stat: q.stat,
      },
    }));

    const resp = await cw.send(new GetMetricDataCommand({ MetricDataQueries: metricQueries, StartTime: startTime, EndTime: endTime }));
    const series: Record<string, Record<string, number>> = {};
    for (const r of resp.MetricDataResults ?? []) {
      for (let i = 0; i < (r.Timestamps?.length ?? 0); i++) {
        const ts = r.Timestamps![i].toISOString();
        series[ts] = series[ts] || {};
        series[ts][r.Id!] = r.Values![i];
      }
    }
    for (const [ts, vals] of Object.entries(series)) {
      results.push({
        timestamp: ts, modelId, region,
        invocations: vals.invocations ?? 0,
        inputTokens: vals.inputTokens ?? 0,
        outputTokens: vals.outputTokens ?? 0,
        avgLatencyMs: vals.latency ?? 0,
        serverErrors: vals.errors ?? 0,
        cacheReadTokens: vals.cacheRead ?? 0,
        cacheWriteTokens: vals.cacheWrite ?? 0,
        timeToFirstTokenMs: vals.ttft ?? 0,
        throttles: vals.throttles ?? 0,
      });
    }
  }
  return results;
}

export async function fetchMetrics(startTime: Date, endTime: Date, periodSec = 3600): Promise<MetricDataPoint[]> {
  const regions = (process.env.AWS_REGIONS || process.env.AWS_REGION || config.region).split(',');
  console.log(`Scanning regions: ${regions.join(', ')}`);
  const all: MetricDataPoint[] = [];
  for (const region of regions) {
    all.push(...await fetchForRegion(region.trim(), startTime, endTime, periodSec));
  }
  return all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
