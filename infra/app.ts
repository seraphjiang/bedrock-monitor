#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BedrockMonitorStack } from './bedrock-monitor-stack';

const app = new cdk.App();
new BedrockMonitorStack(app, 'BedrockMonitorStack', {
  env: { account: '544277935543', region: 'us-west-2' },
});
