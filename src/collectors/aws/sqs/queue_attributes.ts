import * as AWS from 'aws-sdk';
import { BaseCollector } from "../../base";
import { AWSErrorHandler } from '../../../utils/aws';
import { QueueUrlsCollector } from './queue_urls';
import { CollectorUtil } from '../../../utils';
import { Dictionary } from '../../../types';

export class QueueAttributesCollector extends BaseCollector {
    collect() {
        return this.getAllQueues();
    }
    private async getAllQueues() {

        const serviceName = 'SQS';
        const sqsRegions = this.getRegions(serviceName);
        const queueUrlsCollector = new QueueUrlsCollector();
        queueUrlsCollector.setSession(this.getSession());
        const queue_attributes = {};
        try {
            const queueUrlsData = await CollectorUtil.cachedCollect(queueUrlsCollector);
            const queue_urls: Dictionary<string[]> = queueUrlsData.queue_urls;

            for (let region of sqsRegions) {
                try {
                    let sqs = this.getClient(serviceName, region) as AWS.SQS;
                    queue_attributes[region] = {};
                    for (let queueUrl of queue_urls[region]) {
                        console.log("queueUrl", queueUrl);
                        const getQueueAttributesResult: AWS.SQS.GetQueueAttributesResult = await sqs.getQueueAttributes({ QueueUrl: queueUrl, AttributeNames: ["All"] }).promise();
                        console.log("getQueueAttributesResult", getQueueAttributesResult);
                        if (getQueueAttributesResult.Attributes) {
                            queue_attributes[region][queueUrl] = getQueueAttributesResult.Attributes;
                        }
                    }
                } catch (error) {
                    AWSErrorHandler.handle(error);
                    continue;
                }
            }
        } catch (error) {
            AWSErrorHandler.handle(error);
        }
        return { queue_attributes };
    }

}

