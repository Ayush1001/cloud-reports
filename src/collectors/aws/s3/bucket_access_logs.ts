import * as AWS from 'aws-sdk';
import { BaseCollector } from "../../base";
import { BucketsCollector } from './buckets';
import { CollectorUtil } from "../../../utils";
import { AWSErrorHandler } from '../../../utils/aws';

export class BucketAccessLogsCollector extends BaseCollector {
    collect() {
        return this.listAllBucketAccessLogs();
    }

    private async listAllBucketAccessLogs() {
        const s3 = this.getClient('S3', 'us-east-1') as AWS.S3;
        const bucketsCollector = new BucketsCollector();
        bucketsCollector.setSession(this.getSession());
        let bucket_access_logs = {};
        try {
            const bucketsData = await CollectorUtil.cachedCollect(bucketsCollector);
            for (let bucket of bucketsData.buckets) {
                try {
                    let s3BucketAccessLogs: AWS.S3.GetBucketLoggingOutput = await s3.getBucketLogging({ Bucket: bucket.Name }).promise();
                    bucket_access_logs[bucket.Name] = s3BucketAccessLogs;
                } catch (error) {
                    AWSErrorHandler.handle(error);
                    continue;
                }
            }
        } catch (error) {
            AWSErrorHandler.handle(error);
        }
        return { bucket_access_logs };
    }
}
