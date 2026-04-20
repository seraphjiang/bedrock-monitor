import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { config } from '../src/config.js';

const client = new BedrockRuntimeClient({ region: config.region });

const TEST_PROMPTS = [
  'Explain quantum computing in one sentence.',
  'Write a haiku about cloud infrastructure.',
  'What is the capital of France?',
  'Summarize the benefits of serverless architecture.',
  'Translate "hello world" to Japanese.',
];

const MODELS = [
  'amazon.nova-pro-v1:0',
  'amazon.nova-2-lite-v1:0',
  'us.anthropic.claude-haiku-4-5-20251001-v1:0',
];

function buildRequestBody(modelId: string, prompt: string): string {
  if (modelId.includes('anthropic')) {
    return JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });
  }
  return JSON.stringify({
    inputText: prompt,
    textGenerationConfig: { maxTokenCount: 200, temperature: 0.7 },
  });
}

async function invoke(modelId: string, prompt: string) {
  const body = buildRequestBody(modelId, prompt);
  try {
    const start = Date.now();
    const resp = await client.send(new InvokeModelCommand({ modelId, body, contentType: 'application/json', accept: 'application/json' }));
    const latency = Date.now() - start;
    const output = JSON.parse(new TextDecoder().decode(resp.body));
    console.log(`✓ ${modelId} (${latency}ms): ${prompt.slice(0, 40)}...`);
    return { modelId, prompt, latency, output };
  } catch (e: any) {
    console.log(`✗ ${modelId}: ${e.name} — ${e.message}`);
    return null;
  }
}

async function main() {
  const count = parseInt(process.env.COUNT || '10', 10);
  console.log(`Generating ${count} test Bedrock invocations...`);
  const results = [];
  for (let i = 0; i < count; i++) {
    const model = MODELS[i % MODELS.length];
    const prompt = TEST_PROMPTS[i % TEST_PROMPTS.length];
    const result = await invoke(model, prompt);
    if (result) results.push(result);
    await new Promise(r => setTimeout(r, 500)); // rate limit
  }
  console.log(`\nCompleted ${results.length}/${count} invocations.`);
  console.log('Logs will appear in CloudWatch within ~2 minutes (if logging is enabled).');
}

main().catch(console.error);
