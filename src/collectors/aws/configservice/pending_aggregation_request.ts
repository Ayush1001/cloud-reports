import * as AWS from "aws-sdk";
import { CommonUtil } from "../../../utils";
import { AWSErrorHandler } from "../../../utils/aws";
import { BaseCollector } from "../../base";

export class pendingAggregationRequestsCollector extends BaseCollector {
    public collect(callback: (err?: Error, data?: any) => void) {
        return this.getAllPendingAggregationRequests();
    }
    private async getAllPendingAggregationRequests() {
        const self = this;
        const serviceName = "ConfigService";
        const configserviceRegions = self.getRegions(serviceName);
        const pending_aggregation_requests = {};

        for (const region of configserviceRegions) {
            try {
                const confiservice = self.getClient(serviceName, region) as AWS.ConfigService;
                pending_aggregation_requests[region] = [];
                let fetchPending = true;
                let token: string | undefined;
                while(fetchPending) {
                    const pendingAggregationRequestsResponse:
                        AWS.ConfigService.Types.DescribePendingAggregationRequestsResponse = await confiservice.describePendingAggregationRequests
                            ().promise();
                    pending_aggregation_requests[region] = pending_aggregation_requests[region].concat(pendingAggregationRequestsResponse.PendingAggregationRequests);
                    fetchPending = token !== undefined;                 
                    await CommonUtil.wait(200);
                }    
            }catch (error) {
                AWSErrorHandler.handle(error);
            }
        }
        return { pending_aggregation_requests };   
    }
}