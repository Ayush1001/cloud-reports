import {
    CheckAnalysisType, ICheckAnalysisResult, IDictionary,
    IResourceAnalysisResult, SeverityStatus,
} from "../../../types";
import { BaseAnalyzer } from "../../base";

export class SecurityGroupsWidePortRangeAnalyzer extends BaseAnalyzer {
    public  checks_what : string = "Are there any security groups with wide range of ports?";
    public  checks_why : string = `Security group should not expose wide range of
    port as it will be valnerable for port scan attacks`;
    public  checks_recommendation : string = "Recommended to expose only port used by application";
    public  checks_name : string = "SecurityGroup";
    public analyze(params: any, fullReport?: any): any {
        const allSecurityGroups = params.security_groups;
        if (!allSecurityGroups) {
            return undefined;
        }
        const security_groups_wide_port_range: ICheckAnalysisResult = { type: CheckAnalysisType.Security };
        security_groups_wide_port_range.what = this.checks_what;
        security_groups_wide_port_range.why = this.checks_why;
        security_groups_wide_port_range.recommendation = this.checks_recommendation;
        const allRegionsAnalysis: IDictionary<IResourceAnalysisResult[]> = {};
        for (const region in allSecurityGroups) {
            const regionSecurityGroups = allSecurityGroups[region];
            allRegionsAnalysis[region] = [];
            for (const securityGroup of regionSecurityGroups) {
                if (securityGroup.GroupName === "default") {
                    continue;
                }
                const securityGroupAnalysis: IResourceAnalysisResult = {};
                securityGroupAnalysis.resource = securityGroup;
                securityGroupAnalysis.resourceSummary = {
                    name: this.checks_name,
                    value: `${securityGroup.GroupName} | ${securityGroup.GroupId}`,
                };
                if (this.containsWidePortRange(securityGroup)) {
                    securityGroupAnalysis.severity = SeverityStatus.Failure;
                    securityGroupAnalysis.message = "Exposes wide port range";
                    securityGroupAnalysis.action = "Remove rule containing IP protocol: -1";
                } else {
                    securityGroupAnalysis.severity = SeverityStatus.Good;
                    securityGroupAnalysis.message = "Exposes only specific ports";
                }
                allRegionsAnalysis[region].push(securityGroupAnalysis);
            }
        }
        security_groups_wide_port_range.regions = allRegionsAnalysis;
        return { security_groups_wide_port_range };
    }

    private containsWidePortRange(securityGroup: any) {
        if (!securityGroup) {
            return false;
        }

        return securityGroup.IpPermissions.some((rule) => {
            return rule.IpProtocol === "-1";
        });
    }
}
