export const config = {
  region: process.env.AWS_REGION || 'us-west-2',
  accountId: process.env.AWS_ACCOUNT_ID || '544277935543', // your AWS account
  bedrock: {
    logGroupName: process.env.BEDROCK_LOG_GROUP || '/aws/bedrock/invocations',
  },
  opensearch: {
    endpoint: process.env.OPENSEARCH_ENDPOINT || 'http://localhost:9200',
    index: process.env.OPENSEARCH_INDEX || 'bedrock-invocations',
  },
  s3: {
    bucket: process.env.S3_BUCKET || 'bedrock-monitor-544277935543',
    prefix: process.env.S3_PREFIX || 'bedrock-logs/',
  },
};
