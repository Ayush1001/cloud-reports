import * as AWS from 'aws-sdk';
import { BaseCollector } from "../../base";
import { LogUtil } from '../../../utils/log';
import { CollectorUtil } from '../../../utils';
import { DistributionsCollector } from './distributions';

export class DistributionConfigsCollector extends BaseCollector {
    collect() {
        return this.listAllDistributionConfigs();
    }

    private async listAllDistributionConfigs() {
        try {
            const cloudfront = this.getClient('CloudFront', 'us-east-1') as AWS.CloudFront;
            const distributionData = await CollectorUtil.cachedCollect(new DistributionsCollector());
            let distribution_configs = {};
            for (let distribution of distributionData.distributions) {
                let cloudfrontDistributionsData: AWS.CloudFront.GetDistributionConfigResult = await cloudfront.getDistributionConfig({Id: distribution.Id}).promise();
                distribution_configs[distribution.Id] = cloudfrontDistributionsData.DistributionConfig
            }
            return { distribution_configs };
        } catch (error) {
            LogUtil.error(error);
        }
    }
}