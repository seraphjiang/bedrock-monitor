import { CloudWatchClient, GetMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { config } from '../config.js';

const cw = new CloudWatchClient({ region: config.region });

export interface MetricDataPoint {
  timestamp: string;
  modelId: string;
  invocations: number;
  inputTokens: number;
  outputTokens: number;
  avgLatencyMs: number;
  serverErrors: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  timeToFirstTokenMs: number;
}

const MODELS = [
  'anthropic.claude-3-haiku-20240307-v1:0',
  'us.anthropic.claude-haiku-4-5-20251001-v1:0',
];

export async function fetchMetrics(startTime: Date, endTime: Date, periodSec = 3600): Promise<MetricDataPoint[]> {
  const results: MetricDataPoint[] = [];

  for (const modelId of MODELS) {
    const metricQueries = [
      { id: 'invocations', stat: 'Sum', metric: 'Invocations' },
      { id: 'inputTokens', stat: 'Sum', metric: 'InputTokenCount' },
      { id: 'outputTokens', stat: 'Sum', metric: 'OutputTokenCount' },
      { id: 'latency', stat: 'Average', metric: 'InvocationLatency' },
      { id: 'errors', stat: 'Sum', metric: 'InvocationServerErrors' },
      { id: 'cacheRead', stat: 'Sum', metric: 'CacheReadInputTokenCount' },
      { id: 'cacheWrite', stat: 'Sum', metric: 'CacheWriteInputTokenCount' },
      { id: 'ttft', stat: 'Average', metric: 'TimeToFirstToken' },
    ].map(q => ({
      Id: q.id,
      MetricStat: {
        Metric: { Namespace: 'AWS/Bedrock', MetricName: q.metric, Dimensions: [{ Name: 'ModelId', Value: modelId }] },
        Period: periodSec,
        Stat: q.stat,
      },
    }));

    const resp = await cw.send(new GetMetricDataCommand({
      MetricDataQueries: metricQueries,
      StartTime: startTime,
      EndTime: endTime,
    }));

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
        timestamp: ts,
        modelId,
        invocations: vals.invocations ?? 0,
        inputTokens: vals.inputTokens ?? 0,
        outputTokens: vals.outputTokens ?? 0,
        avgLatencyMs: vals.latency ?? 0,
        serverErrors: vals.errors ?? 0,
        cacheReadTokens: vals.cacheRead ?? 0,
        cacheWriteTokens: vals.cacheWrite ?? 0,
        timeToFirstTokenMs: vals.ttft ?? 0,
      });
    }
  }

  return results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
