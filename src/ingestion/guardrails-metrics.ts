import { CloudWatchClient, GetMetricDataCommand, ListMetricsCommand } from '@aws-sdk/client-cloudwatch';
import { config } from '../config.js';
import { GuardrailsDataPoint } from '../types.js';

async function discoverGuardrails(cw: CloudWatchClient): Promise<string[]> {
  const resp = await cw.send(new ListMetricsCommand({ Namespace: 'AWS/Bedrock', MetricName: 'GuardrailsIntervened' }));
  const ids = new Set<string>();
  for (const m of resp.Metrics ?? []) {
    const id = m.Dimensions?.find(d => d.Name === 'GuardrailId')?.Value;
    if (id) ids.add(id);
  }
  return [...ids];
}

async function fetchForRegion(region: string, startTime: Date, endTime: Date, periodSec: number): Promise<GuardrailsDataPoint[]> {
  const cw = new CloudWatchClient({ region });
  const guardrailIds = await discoverGuardrails(cw);
  if (!guardrailIds.length) return [];
  console.log(`  ${region}: found ${guardrailIds.length} guardrails: ${guardrailIds.join(', ')}`);

  const results: GuardrailsDataPoint[] = [];
  for (const guardrailId of guardrailIds) {
    const dims = [{ Name: 'GuardrailId', Value: guardrailId }];
    const resp = await cw.send(new GetMetricDataCommand({
      StartTime: startTime, EndTime: endTime,
      MetricDataQueries: [
        { Id: 'intervened', MetricStat: { Metric: { Namespace: 'AWS/Bedrock', MetricName: 'GuardrailsIntervened', Dimensions: dims }, Period: periodSec, Stat: 'Sum' } },
        { Id: 'blocked', MetricStat: { Metric: { Namespace: 'AWS/Bedrock', MetricName: 'GuardrailsBlocked', Dimensions: dims }, Period: periodSec, Stat: 'Sum' } },
      ],
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
      results.push({ timestamp: ts, guardrailId, region, intervened: vals.intervened ?? 0, blocked: vals.blocked ?? 0 });
    }
  }
  return results;
}

export async function fetchGuardrailsMetrics(startTime: Date, endTime: Date, periodSec = 3600): Promise<GuardrailsDataPoint[]> {
  const regions = (process.env.AWS_REGIONS || process.env.AWS_REGION || config.region).split(',');
  console.log(`Scanning guardrails in regions: ${regions.join(', ')}`);
  const all: GuardrailsDataPoint[] = [];
  for (const region of regions) {
    all.push(...await fetchForRegion(region.trim(), startTime, endTime, periodSec));
  }
  return all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
