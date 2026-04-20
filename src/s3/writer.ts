import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config.js';
import { BedrockInvocation } from '../types.js';

const s3 = new S3Client({ region: config.region });

export async function writeNdjsonToS3(docs: BedrockInvocation[], key?: string) {
  const ndjson = docs.map(d => JSON.stringify(d)).join('\n') + '\n';
  const s3Key = key || `${config.s3.prefix}${new Date().toISOString().slice(0, 10)}/${Date.now()}.ndjson`;
  await s3.send(new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: s3Key,
    Body: ndjson,
    ContentType: 'application/x-ndjson',
  }));
  console.log(`Wrote ${docs.length} records to s3://${config.s3.bucket}/${s3Key}`);
}
