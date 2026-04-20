import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

const ACCOUNT_ID = '544277935543';

export class BedrockMonitorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // CloudWatch Log Group for Bedrock invocation logs
    const logGroup = new logs.LogGroup(this, 'BedrockInvocationLogs', {
      logGroupName: '/aws/bedrock/invocations',
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // S3 bucket for log archival
    const bucket = new s3.Bucket(this, 'LogArchiveBucket', {
      bucketName: `bedrock-monitor-${ACCOUNT_ID}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{ expiration: cdk.Duration.days(90) }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // IAM role for Bedrock to write to CloudWatch Logs and S3
    const bedrockLoggingRole = new iam.Role(this, 'BedrockLoggingRole', {
      roleName: 'BedrockLoggingRole',
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      description: 'Allows Bedrock to write invocation logs to CloudWatch and S3',
    });

    logGroup.grantWrite(bedrockLoggingRole);
    bucket.grantPut(bedrockLoggingRole);

    // Outputs
    new cdk.CfnOutput(this, 'LogGroupName', { value: logGroup.logGroupName });
    new cdk.CfnOutput(this, 'BucketName', { value: bucket.bucketName });
    new cdk.CfnOutput(this, 'RoleArn', { value: bedrockLoggingRole.roleArn });
  }
}
