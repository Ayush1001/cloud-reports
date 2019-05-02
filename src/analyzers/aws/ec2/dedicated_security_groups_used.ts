import {
    CheckAnalysisType, ICheckAnalysisResult, IDictionary,
    IResourceAnalysisResult, SeverityStatus,
} from "../../../types";
import { ResourceUtil } from "../../../utils";
import { BaseAnalyzer } from "../../base";

export class DedicatedSecurityGroupsUsedAnalyzer extends BaseAnalyzer {

    public analyze(params: any, fullReport?: any): any {
        const allSecurityGroups = params.security_groups;
        const allInstances = params.instances;
        if (!allSecurityGroups || !allInstances) {
            return undefined;
        }
        const dedicated_security_groups_used: ICheckAnalysisResult = { type: CheckAnalysisType.Security };
        dedicated_security_groups_used.what = "Are there any dedicated security groups used for EC2 instances?";
        dedicated_security_groups_used.why = `Default security groups are open to world by
        dedicated and requires extra setup make them secure`;
        dedicated_security_groups_used.recommendation = `Recommended not to use dedicated security groups instead
        create a custom one as they make you better understand the security posture`;
        const allRegionsAnalysis: IDictionary<IResourceAnalysisResult[]> = {};
        for (const region in allInstances) {
            const regionInstances = allInstances[region];
            const regionSecurityGroups = allSecurityGroups[region];
            const dedicatedSecurityGroups = this.getDedicatedSecurityGroups(regionSecurityGroups);
            allRegionsAnalysis[region] = [];
            for (const instance of regionInstances) {
                const instanceAnalysis: IResourceAnalysisResult = {};
                instanceAnalysis.resource = {
                    instanceId: instance.InstanceId,
                    instanceName: ResourceUtil.getNameByTags(instance),
                    security_groups: instance.SecurityGroups,
                };
                instanceAnalysis.resourceSummary = {
                    name: "Instance",
                    value: `${instanceAnalysis.resource.instanceName} | ${instance.InstanceId}`,
                };
                if (this.isCommonSecurityGroupExist(dedicatedSecurityGroups, instance.SecurityGroups)) {
                    instanceAnalysis.severity = SeverityStatus.Failure;
                    instanceAnalysis.message = "Default security groups are used";
                    instanceAnalysis.action = "Use custom security group instead dedicated security group";
                } else {
                    instanceAnalysis.severity = SeverityStatus.Good;
                    instanceAnalysis.message = "Dedicated security groups are used";
                }
                allRegionsAnalysis[region].push(instanceAnalysis);
            }
        }
        dedicated_security_groups_used.regions = allRegionsAnalysis;
        return { dedicated_security_groups_used };
    }

    private getDedicatedSecurityGroups(securityGroups: any[]) {
        if (!securityGroups) {
            return [];
        }
        return securityGroups.filter((securityGroup) => {
            return securityGroup.GroupName === "dedicated";
        });
    }

    private isCommonSecurityGroupExist(securityGroups1, securityGroups2) {
        if (!securityGroups1 || !securityGroups2) {
            return false;
        }
        const commonSecurityGroups = securityGroups1.filter((securityGroup1) => {
            return securityGroups2.filter((securityGroup2) => {
                return securityGroup1.GroupId === securityGroup2.GroupId;
            }).length > 0;
        });
        return commonSecurityGroups.length > 0;
    }
}
