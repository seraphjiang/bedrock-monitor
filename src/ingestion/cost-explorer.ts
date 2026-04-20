import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import { CostDataPoint } from '../types.js';

export async function fetchCosts(startDate: string, endDate: string): Promise<CostDataPoint[]> {
  const ce = new CostExplorerClient({ region: 'us-east-1' }); // Cost Explorer is us-east-1 only
  const results: CostDataPoint[] = [];
  let nextToken: string | undefined;

  do {
    const resp = await ce.send(new GetCostAndUsageCommand({
      TimePeriod: { Start: startDate, End: endDate },
      Granularity: 'DAILY',
      Metrics: ['UnblendedCost', 'UsageQuantity'],
      Filter: { Dimensions: { Key: 'SERVICE', Values: ['Amazon Bedrock'] } },
      GroupBy: [{ Type: 'DIMENSION', Key: 'USAGE_TYPE' }],
      NextPageToken: nextToken,
    }));

    for (const result of resp.ResultsByTime ?? []) {
      const ts = result.TimePeriod?.Start ?? '';
      for (const group of result.Groups ?? []) {
        const usageType = group.Keys?.[0] ?? 'Unknown';
        const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount ?? '0');
        const unit = group.Metrics?.UnblendedCost?.Unit ?? 'USD';
        if (amount > 0) {
          results.push({ timestamp: ts, service: 'Amazon Bedrock', usageType, amountUsd: amount, unit });
        }
      }
    }
    nextToken = resp.NextPageToken;
  } while (nextToken);

  return results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
