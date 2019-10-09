import * as AWS from "aws-sdk";
import { CommonUtil } from "../../../utils";
import { AWSErrorHandler } from "../../../utils/aws";
import { BaseCollector } from "../../base";

export class EC2VolumesCollector extends BaseCollector {
    public collect() {
        return this.getAllVolumes();
    }

    private async getAllVolumes() {

        const serviceName = "EC2";
        const ec2Regions = this.getRegions(serviceName);
        const volumes = {};

        for (const region of ec2Regions) {
            try {
                const ec2 = this.getClient(serviceName, region) as AWS.EC2;
                const volumesResponse: AWS.EC2.DescribeVolumesResult =
                    await ec2.describeVolumes().promise();
                if (volumesResponse && volumesResponse.Volumes) {
                    volumes[region] = volumesResponse.Volumes;
                }
                await CommonUtil.wait(200);
            } catch (error) {
                AWSErrorHandler.handle(error);
                continue;
            }
        }
        return { volumes };
    }
}
