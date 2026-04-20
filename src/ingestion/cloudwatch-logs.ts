import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { config } from '../config.js';
import { BedrockInvocation, estimateCost } from '../types.js';

const cwl = new CloudWatchLogsClient({ region: config.region });

export function parseLogEvent(message: string): BedrockInvocation | null {
  try {
    const raw = JSON.parse(message);
    if (!raw.modelId && !raw.model_id) return null; // skip non-invocation entries    const modelId = raw.modelId || raw.model_id || '';
    const inputTokens = raw.input?.inputTokenCount ?? 0;
    const outputTokens = raw.output?.outputTokenCount ?? 0;
    return {
      timestamp: raw.timestamp || new Date().toISOString(),
      requestId: raw.requestId || '',
      modelId,
      operation: raw.operation || 'InvokeModel',
      region: raw.region || config.region,
      identity: { arn: raw.identity?.arn || '', accountId: raw.accountId || config.accountId },
      input: { inputTokenCount: inputTokens, inputBodyJson: raw.input?.inputBodyJson },
      output: { outputTokenCount: outputTokens, outputBodyJson: raw.output?.outputBodyJson, statusCode: raw.output?.statusCode ?? 200 },
      latencyMs: raw.latency ?? raw.latencyMs ?? 0,
      errorCode: raw.errorCode,
      estimatedCostUsd: estimateCost(modelId, inputTokens, outputTokens),
    };
  } catch { return null; }
}

export async function* fetchLogs(startTime: number, endTime: number): AsyncGenerator<BedrockInvocation> {
  let nextToken: string | undefined;
  do {
    const resp = await cwl.send(new FilterLogEventsCommand({
      logGroupName: config.bedrock.logGroupName,
      startTime,
      endTime,
      nextToken,
    }));
    for (const event of resp.events ?? []) {
      const parsed = parseLogEvent(event.message || '');
      if (parsed) yield parsed;
    }
    nextToken = resp.nextToken;
  } while (nextToken);
}
