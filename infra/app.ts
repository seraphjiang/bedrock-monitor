#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BedrockMonitorStack } from './bedrock-monitor-stack';

const app = new cdk.App();
new BedrockMonitorStack(app, 'BedrockMonitorStack', {
  env: { account: 'YOUR_ACCOUNT_ID', region: 'us-west-2' },
});
