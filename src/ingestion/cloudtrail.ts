import { CloudTrailClient, LookupEventsCommand } from '@aws-sdk/client-cloudtrail';
import { CloudTrailEvent } from '../types.js';

export async function* fetchCloudTrailEvents(
  regions: string[],
  startTime: Date,
  endTime: Date,
): AsyncGenerator<CloudTrailEvent> {
  for (const region of regions) {
    const ct = new CloudTrailClient({ region });
    let nextToken: string | undefined;
    do {
      let resp;
      for (let attempt = 0; ; attempt++) {
        try {
          resp = await ct.send(new LookupEventsCommand({
            LookupAttributes: [{ AttributeKey: 'EventSource', AttributeValue: 'bedrock.amazonaws.com' }],
            StartTime: startTime,
            EndTime: endTime,
            NextToken: nextToken,
            MaxResults: 50,
          }));
          break;
        } catch (e: any) {
          if (e.name === 'ThrottlingException' && attempt < 5) {
            const delay = 1000 * Math.pow(2, attempt);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          throw e;
        }
      }
      await new Promise(r => setTimeout(r, 500));
      for (const event of resp.Events ?? []) {
        try {
          const raw = JSON.parse(event.CloudTrailEvent || '{}');
          yield {
            eventTime: raw.eventTime || event.EventTime?.toISOString() || '',
            eventName: raw.eventName || event.EventName || '',
            eventSource: raw.eventSource || 'bedrock.amazonaws.com',
            awsRegion: raw.awsRegion || region,
            sourceIPAddress: raw.sourceIPAddress || '',
            userAgent: raw.userAgent || '',
            userIdentity: {
              type: raw.userIdentity?.type || '',
              arn: raw.userIdentity?.arn || '',
              accountId: raw.userIdentity?.accountId || '',
            },
            requestParameters: raw.requestParameters || null,
            responseElements: raw.responseElements || null,
            errorCode: raw.errorCode,
            errorMessage: raw.errorMessage,
          };
        } catch { /* skip unparseable */ }
      }
      nextToken = resp.NextToken;
    } while (nextToken);
  }
}
