export interface BedrockInvocation {
  timestamp: string;
  requestId: string;
  modelId: string;
  operation: string;
  region: string;
  identity: { arn: string; accountId: string };
  input: { inputTokenCount: number; inputBodyJson?: Record<string, unknown> };
  output: { outputTokenCount: number; outputBodyJson?: Record<string, unknown>; statusCode: number };
  latencyMs: number;
  errorCode?: string;
  estimatedCostUsd?: number;
}

// Approximate per-1K-token pricing (input/output) — update as needed
export const MODEL_PRICING: Record<string, [number, number]> = {
  'anthropic.claude-sonnet-4-20250514-v1:0': [0.003, 0.015],
  'anthropic.claude-haiku-4-5-20251001-v1:0': [0.0008, 0.004],
  'amazon.nova-pro-v1:0': [0.0008, 0.0032],
  'amazon.nova-2-lite-v1:0': [0.00006, 0.00024],
  'mistral.voxtral-mini-3b-2507': [0.00015, 0.00015],
};

export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const pricing = Object.entries(MODEL_PRICING).find(([k]) => modelId.includes(k));
  if (!pricing) return 0;
  const [inputRate, outputRate] = pricing[1];
  return (inputTokens / 1000) * inputRate + (outputTokens / 1000) * outputRate;
}

export interface GuardrailsDataPoint {
  timestamp: string;
  guardrailId: string;
  region: string;
  intervened: number;
  blocked: number;
}

export interface CostDataPoint {
  timestamp: string;
  service: string;
  usageType: string;
  amountUsd: number;
  unit: string;
}

export interface CloudTrailEvent {
  eventTime: string;
  eventName: string;
  eventSource: string;
  awsRegion: string;
  sourceIPAddress: string;
  userAgent: string;
  userIdentity: { type: string; arn: string; accountId: string };
  requestParameters: Record<string, unknown> | null;
  responseElements: Record<string, unknown> | null;
  errorCode?: string;
  errorMessage?: string;
}
