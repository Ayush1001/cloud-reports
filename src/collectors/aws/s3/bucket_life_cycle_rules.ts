import * as AWS from 'aws-sdk';
import { BaseCollector } from "../../base";
import { BucketsCollector } from './buckets';
import { CollectorUtil } from "../../../utils";
import { AWSErrorHandler } from '../../../utils/aws';

export class BucketLifecycleRulesCollector extends BaseCollector {
    collect() {
        return this.listAllBucketLifecylceRules();
    }

    private async listAllBucketLifecylceRules() {
        const s3 = this.getClient('S3', 'us-east-1') as AWS.S3;
        const bucketsCollector =  new BucketsCollector();
        bucketsCollector.setSession(this.getSession());
        const bucketsData = await CollectorUtil.cachedCollect(bucketsCollector);
        let bucket_life_cycle_rules = {};
        for (let bucket of bucketsData.buckets) {
            try {
                let s3BucketPolicy: AWS.S3.GetBucketLifecycleConfigurationOutput = await s3.getBucketLifecycleConfiguration({ Bucket: bucket.Name }).promise();
                bucket_life_cycle_rules[bucket.Name] = s3BucketPolicy.Rules;
            } catch (err) {
                if(err.code === 'NoSuchLifecycleConfiguration') {
                    bucket_life_cycle_rules[bucket.Name] = undefined;
                } else {
                    AWSErrorHandler.handle(err);
                }
                continue;
            }
        }
        return { bucket_life_cycle_rules };
    }
}
