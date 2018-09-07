import * as AWS from 'aws-sdk';
import { BaseCollector } from "../../base";
import { BucketsCollector } from './buckets';
import { CollectorUtil } from "../../../utils";
import { LogUtil } from '../../../utils/log';

export class BucketAclsCollector extends BaseCollector {
    collect() {
        return this.listAllBucketAcls();
    }

    private async listAllBucketAcls() {
        const s3 = this.getClient('S3', 'us-east-1') as AWS.S3;
        const bucketsCollector = new BucketsCollector();
        bucketsCollector.setSession(this.getSession());
        const bucketsData = await CollectorUtil.cachedCollect(bucketsCollector);
        let bucket_acls = {};
        for (let bucket of bucketsData.buckets) {
            try {
                let s3BucketAcl: AWS.S3.GetBucketAclOutput = await s3.getBucketAcl({ Bucket: bucket.Name }).promise();
                bucket_acls[bucket.Name] = s3BucketAcl;
            } catch (error) {
                LogUtil.error(error);
                continue;
            }
        }
        return { bucket_acls };
    }
}
