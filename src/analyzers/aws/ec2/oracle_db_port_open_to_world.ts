import {
    CheckAnalysisType, ICheckAnalysisResult, IDictionary,
    IResourceAnalysisResult, SeverityStatus,
} from "../../../types";
import { BaseAnalyzer } from "../../base";

export class OraclePortOpenToWorldAnalyzer extends BaseAnalyzer {
    public  checks_what : string =  "Is Oracle port open to world?";
    public  checks_why : string =  "We should always restrict Oracle port only intended parties to access";
    public checks_recommendation : string =  `Recommended to restrict Oracle
        port in security groups to specific IPs`;
    public checks_name : string = "SecurityGroup";
    public analyze(params: any, fullReport?: any): any {
        const allSecurityGroups = params.security_groups;
        if (!allSecurityGroups) {
            return undefined;
        }
        const oracle_db_port_open_to_world: ICheckAnalysisResult = { type: CheckAnalysisType.Security };
        oracle_db_port_open_to_world.what = this.checks_what;
        oracle_db_port_open_to_world.why =this.checks_why;
        oracle_db_port_open_to_world.recommendation = this.checks_recommendation;
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
                if (this.isOracleOpenToWorld(securityGroup)) {
                    securityGroupAnalysis.severity = SeverityStatus.Failure;
                    securityGroupAnalysis.message = "Oracle Port is open to entire world";
                    securityGroupAnalysis.action = "Restrict Oracle port";
                } else {
                    securityGroupAnalysis.severity = SeverityStatus.Good;
                    securityGroupAnalysis.message = "Oracle port is not open to entire world";
                }
                allRegionsAnalysis[region].push(securityGroupAnalysis);
            }
        }
        oracle_db_port_open_to_world.regions = allRegionsAnalysis;
        return { oracle_db_port_open_to_world };
    }

    private isOracleOpenToWorld(securityGroup: any) {
        if (!securityGroup) {
            return false;
        }

        return securityGroup.IpPermissions.some((rule) => {
            return rule.FromPort === 1521 && rule.IpRanges.some((ipRange) => {
                return ipRange.CidrIp === "0.0.0.0/0";
            });
        });
    }
}
