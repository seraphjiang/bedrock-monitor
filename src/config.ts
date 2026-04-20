export const config = {
  region: process.env.AWS_REGION || 'us-west-2',
  accountId: process.env.AWS_ACCOUNT_ID || 'YOUR_ACCOUNT_ID', // your AWS account
  bedrock: {
    logGroupName: process.env.BEDROCK_LOG_GROUP || '/aws/bedrock/invocations',
  },
  opensearch: {
    endpoint: process.env.OPENSEARCH_ENDPOINT || 'http://localhost:9200',
    index: process.env.OPENSEARCH_INDEX || 'bedrock-invocations',
  },
  s3: {
    bucket: process.env.S3_BUCKET || 'bedrock-monitor-YOUR_ACCOUNT_ID',
    prefix: process.env.S3_PREFIX || 'bedrock-logs/',
  },
};
