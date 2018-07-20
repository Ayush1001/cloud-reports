import * as AWS from 'aws-sdk';
import { BaseCollector } from "../../base";

export class EC2ReservedInstancesCollector extends BaseCollector {
    collect() {
        return this.getAllInstances();
    }

    private async getAllInstances() {

        const serviceName = 'EC2';
        const ec2Regions = this.getRegions(serviceName);
        const reserved_instances = {};

        for (let region of ec2Regions) {
            try {
                let ec2 = this.getClient(serviceName, region) as AWS.EC2;
                const instancesResponse: AWS.EC2.DescribeReservedInstancesResult = await ec2.describeReservedInstances().promise();
                if (instancesResponse && instancesResponse.ReservedInstances) {
                    reserved_instances[region] = instancesResponse.ReservedInstances
                }
            } catch (error) {
                console.error(error);
                continue;
            }
        }
        return { reserved_instances };
    }
}