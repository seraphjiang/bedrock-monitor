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
      const resp = await ct.send(new LookupEventsCommand({
        LookupAttributes: [{ AttributeKey: 'EventSource', AttributeValue: 'bedrock.amazonaws.com' }],
        StartTime: startTime,
        EndTime: endTime,
        NextToken: nextToken,
        MaxResults: 50,
      }));
      await new Promise(r => setTimeout(r, 1000)); // rate limit
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
