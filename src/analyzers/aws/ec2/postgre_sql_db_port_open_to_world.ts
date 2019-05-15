import {
    CheckAnalysisType, ICheckAnalysisResult, IDictionary,
    IResourceAnalysisResult, SeverityStatus,
} from "../../../types";
import { BaseAnalyzer } from "../../base";

export class PostgreSQLPortOpenToWorldAnalyzer extends BaseAnalyzer {
    public  checks_what : string = "Is PostgreSQL port open to world?";
    public  checks_why : string = `We should always restrict PostgreSQL
    port only intended parties to access`;
    public  checks_recommendation : string = `Recommended to restrict PostgreSQL
        port in security groups to specific IPs`;
    public  checks_name : string = "SecurityGroup";
    public analyze(params: any, fullReport?: any): any {
        const allSecurityGroups = params.security_groups;
        if (!allSecurityGroups) {
            return undefined;
        }
        const postgre_sql_db_port_open_to_world: ICheckAnalysisResult = { type: CheckAnalysisType.Security };
        postgre_sql_db_port_open_to_world.what = this.checks_what;
        postgre_sql_db_port_open_to_world.why = this.checks_why;
        postgre_sql_db_port_open_to_world.recommendation = this.checks_recommendation;
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
                if (this.isPostgreSQLOpenToWorld(securityGroup)) {
                    securityGroupAnalysis.severity = SeverityStatus.Failure;
                    securityGroupAnalysis.message = "PostgreSQL Port is open to entire world";
                    securityGroupAnalysis.action = "Restrict PostgreSQL port";
                } else {
                    securityGroupAnalysis.severity = SeverityStatus.Good;
                    securityGroupAnalysis.message = "PostgreSQL port is not open to entire world";
                }
                allRegionsAnalysis[region].push(securityGroupAnalysis);
            }
        }
        postgre_sql_db_port_open_to_world.regions = allRegionsAnalysis;
        return { postgre_sql_db_port_open_to_world };
    }

    private isPostgreSQLOpenToWorld(securityGroup: any) {
        if (!securityGroup) {
            return false;
        }

        return securityGroup.IpPermissions.some((rule) => {
            return rule.FromPort === 5432 && rule.IpRanges.some((ipRange) => {
                return ipRange.CidrIp === "0.0.0.0/0";
            });
        });
    }
}
