import { BedrockClient, PutModelInvocationLoggingConfigurationCommand, GetModelInvocationLoggingConfigurationCommand } from '@aws-sdk/client-bedrock';
import { config } from '../src/config.js';

const bedrock = new BedrockClient({ region: config.region });

async function main() {
  const existing = await bedrock.send(new GetModelInvocationLoggingConfigurationCommand({}));
  if (existing.loggingConfig) {
    console.log('Logging already configured:', JSON.stringify(existing.loggingConfig, null, 2));
    return;
  }

  await bedrock.send(new PutModelInvocationLoggingConfigurationCommand({
    loggingConfig: {
      cloudWatchConfig: {
        logGroupName: config.bedrock.logGroupName,
        roleArn: `arn:aws:iam::${config.accountId}:role/BedrockLoggingRole`,
        largeDataDeliveryS3Config: { bucketName: config.s3.bucket, keyPrefix: 'large-data/' },
      },
      textDataDeliveryEnabled: true,
      imageDataDeliveryEnabled: false,
      embeddingDataDeliveryEnabled: true,
    },
  }));
  console.log('Bedrock invocation logging enabled.');
  console.log(`Logs will appear in CloudWatch: ${config.bedrock.logGroupName}`);
  console.log(`\nNOTE: You need to create the IAM role 'BedrockLoggingRole' with CloudWatch Logs write permissions.`);
}

main().catch(console.error);
