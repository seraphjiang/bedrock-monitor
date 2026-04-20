import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as opensearchserverless from 'aws-cdk-lib/aws-opensearchserverless';
import { Construct } from 'constructs';

const ACCOUNT_ID = 'YOUR_ACCOUNT_ID';
const COLLECTION_NAME = 'bedrock-monitor';

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

    // --- OpenSearch Serverless (Phase 2) ---

    // Lambda execution role for ingestion (Phase 2 Lambdas will use this)
    const lambdaRole = new iam.Role(this, 'IngestionLambdaRole', {
      roleName: 'BedrockMonitorLambdaRole',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Encryption policy (required before collection)
    const encryptionPolicy = new opensearchserverless.CfnSecurityPolicy(this, 'AossEncryption', {
      name: `${COLLECTION_NAME}-enc`,
      type: 'encryption',
      policy: JSON.stringify({
        Rules: [{ ResourceType: 'collection', Resource: [`collection/${COLLECTION_NAME}`] }],
        AWSOwnedKey: true,
      }),
    });

    // Network policy — public access for PoC (restrict to VPC in production)
    const networkPolicy = new opensearchserverless.CfnSecurityPolicy(this, 'AossNetwork', {
      name: `${COLLECTION_NAME}-net`,
      type: 'network',
      policy: JSON.stringify([{
        Rules: [
          { ResourceType: 'collection', Resource: [`collection/${COLLECTION_NAME}`] },
          { ResourceType: 'dashboard', Resource: [`collection/${COLLECTION_NAME}`] },
        ],
        AllowFromPublic: true,
      }]),
    });

    // Collection
    const collection = new opensearchserverless.CfnCollection(this, 'AossCollection', {
      name: COLLECTION_NAME,
      type: 'SEARCH',
      description: 'Bedrock usage analytics',
    });
    collection.addDependency(encryptionPolicy);
    collection.addDependency(networkPolicy);

    // Data access policy — grants Lambda role and deployer access
    new opensearchserverless.CfnAccessPolicy(this, 'AossDataAccess', {
      name: `${COLLECTION_NAME}-access`,
      type: 'data',
      policy: JSON.stringify([{
        Rules: [
          {
            ResourceType: 'index',
            Resource: [`index/${COLLECTION_NAME}/*`],
            Permission: ['aoss:CreateIndex', 'aoss:UpdateIndex', 'aoss:DescribeIndex',
              'aoss:ReadDocument', 'aoss:WriteDocument'],
          },
          {
            ResourceType: 'collection',
            Resource: [`collection/${COLLECTION_NAME}`],
            Permission: ['aoss:CreateCollectionItems', 'aoss:DescribeCollectionItems',
              'aoss:UpdateCollectionItems'],
          },
        ],
        Principal: [lambdaRole.roleArn, `arn:aws:iam::${ACCOUNT_ID}:root`],
      }]),
    });

    // Grant Lambda role AOSS API access
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['aoss:APIAccessAll'],
      resources: [collection.attrArn],
    }));

    // Outputs
    new cdk.CfnOutput(this, 'LogGroupName', { value: logGroup.logGroupName });
    new cdk.CfnOutput(this, 'BucketName', { value: bucket.bucketName });
    new cdk.CfnOutput(this, 'RoleArn', { value: bedrockLoggingRole.roleArn });
    new cdk.CfnOutput(this, 'AossEndpoint', { value: collection.attrCollectionEndpoint });
    new cdk.CfnOutput(this, 'AossDashboardEndpoint', { value: collection.attrDashboardEndpoint });
    new cdk.CfnOutput(this, 'LambdaRoleArn', { value: lambdaRole.roleArn });
  }
}
