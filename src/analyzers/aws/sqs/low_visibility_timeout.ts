import {
    CheckAnalysisType, ICheckAnalysisResult, IDictionary,
    IResourceAnalysisResult, SeverityStatus,
} from "../../../types";
import { BaseAnalyzer } from "../../base";

export class VisibilityTimeoutAnalyzer extends BaseAnalyzer {
    public  checks_what : string = "Is SQS Queue VisibilityTimeout too low?";
    public  checks_why: string =`We need to set proper VisibilityTimeout for the queues
    otherwise messages will be processed multiple times and they will become available to other consumers
    while they are being processed; this will have performance impact.`;
    public  checks_recommendation : string =`Recommended to set VisibilityTimeout
    higher than the maximum processing time of the messages`;
    public  checks_name : string = "Queue";
    public analyze(params: any, fullReport?: any): any {
        const allQueuess = params.queue_attributes;
        if (!allQueuess) {
            return undefined;
        }
        const low_visibility_timeout: ICheckAnalysisResult = { type: CheckAnalysisType.PerformanceEfficiency };
        low_visibility_timeout.what = this.checks_what;
        low_visibility_timeout.why = this.checks_why;
        low_visibility_timeout.recommendation = this.checks_recommendation;
        const allRegionsAnalysis: IDictionary<IResourceAnalysisResult[]> = {};
        for (const region in allQueuess) {
            const regionQueuess = allQueuess[region];
            allRegionsAnalysis[region] = [];
            for (const queueUrl in regionQueuess) {
                const queueAnalysis: IResourceAnalysisResult = {};
                const queueName = this.getQueueName(queueUrl);
                queueAnalysis.resource = { queueName, attributes: regionQueuess[queueUrl] };
                queueAnalysis.resourceSummary = {
                    name: this.checks_name,
                    value: queueName,
                };
                if (regionQueuess[queueUrl].VisibilityTimeout > 5) {
                    queueAnalysis.severity = SeverityStatus.Good;
                    queueAnalysis.message = `Visibility Timeout is ${regionQueuess[queueUrl].VisibilityTimeout}`;
                    queueAnalysis.action = `Make sure that Visibility Timeout is
                     higher than the maximum processing time of the messages`;
                } else {
                    queueAnalysis.severity = SeverityStatus.Warning;
                    queueAnalysis.message = `Visibility Timeout is ${regionQueuess[queueUrl].VisibilityTimeout}`;
                    queueAnalysis.action = `Set Visibility Timeout higher than
                    the maximum processing time of the messages`;
                }
                allRegionsAnalysis[region].push(queueAnalysis);
            }
        }
        low_visibility_timeout.regions = allRegionsAnalysis;
        return { low_visibility_timeout };
    }

    private getQueueName(queueUrl) {
        return queueUrl.split("/").pop();
    }
}
