#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BedrockMonitorStack } from './bedrock-monitor-stack';

const app = new cdk.App();
new BedrockMonitorStack(app, 'BedrockMonitorStack', {
  env: { account: process.env.AWS_ACCOUNT_ID, region: process.env.AWS_REGION || 'us-west-2' },
});
