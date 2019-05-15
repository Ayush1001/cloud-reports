import { CheckAnalysisType, ICheckAnalysisResult, IResourceAnalysisResult, SeverityStatus } from "../../../types";
import { CommonUtil } from "../../../utils";
import { BaseAnalyzer } from "../../base";

export class RolesWithoutExternalIDAnalyzer extends BaseAnalyzer {
    public  checks_what : string = "Are there cross account roles without ExternalId?";
    public  checks_why : string = `It is important to associate
    ExternalId for cross account role access`;
    public checks_recommendation : string = `Recommended to use ExternalId for
    roles which give access to third party accounts`;
    public checks_name : string = "Roles";
    public analyze(params: any, fullReport?: any): any {
        if(!params.roles) {
            return;
        }
        const allRolesPolicies = this.getAssumeRolePolicyDocument(params.roles);
        const mainAccountID = this.getAccountIDs(params.roles[0].Arn)[0];
        const permittedAccounts = this.getPermittedAccounts(allRolesPolicies);
        const cross_accounts_without_external_id: ICheckAnalysisResult = { type: CheckAnalysisType.Security };
        cross_accounts_without_external_id.what = this.checks_what;
        cross_accounts_without_external_id.why = this.checks_why;
        cross_accounts_without_external_id.recommendation = this.checks_recommendation;
        const analysis: IResourceAnalysisResult[] = [];

        permittedAccounts.forEach((roleAccountsObject) => {
            roleAccountsObject.Accounts.forEach((account) => {
                account.accountIDs = this.removeAccountIDFromList(account.accountIDs, mainAccountID);
                if (!account.accountIDs || !account.accountIDs.length) {
                    return;
                }
                const crossAccountAnalysis: IResourceAnalysisResult = {
                    resourceSummary: {
                        name: this.checks_name,
                        value: roleAccountsObject.Role,
                    },
                };
                if (account.ExternalID) {
                    crossAccountAnalysis.severity = SeverityStatus.Good;
                    crossAccountAnalysis.message = `Accounts ${account.accountIDs} has ExternalId`;
                } else {
                    crossAccountAnalysis.severity = SeverityStatus.Failure;
                    crossAccountAnalysis.action = "Add an ExternalId";
                    crossAccountAnalysis.message = `Accounts ${account.accountIDs} does not have ExternalId`;
                }
                analysis.push(crossAccountAnalysis);

            });
        });
        cross_accounts_without_external_id.regions = { global: analysis };
        return { cross_accounts_without_external_id };
    }

    private getAssumeRolePolicyDocument(roles: any[]) {
        if (!roles) {
            return [];
        }
        return roles.map((role) => {
            const rolePolicies: any = {};
            rolePolicies.Role = role.RoleName;
            rolePolicies.AssumeRolePolicyDocument = role.AssumeRolePolicyDocument;
            return rolePolicies;
        });
    }

    private getPermittedAccounts(allPolicies: any[]) {
        if (!allPolicies) {
            return [];
        }
        return allPolicies.map((eachPolicy) => {
            return this.getRoleAccountsObject(eachPolicy.Role, eachPolicy.AssumeRolePolicyDocument.Statement);
        });
    }

    private getRoleAccountsObject(role: string, Statements: any[]) {
        const roleAccountsObject: any = {};
        roleAccountsObject.Role = role;
        roleAccountsObject.Accounts = Statements.filter((statement) => {
            return statement.Principal.AWS;
        }).map((statement) => {
            const accountDetails: any = {};
            accountDetails.accountIDs = this.getAccountIDs(statement.Principal.AWS);
            if (statement.Condition && statement.Condition.StringEquals) {
                accountDetails.ExternalID = statement.Condition.StringEquals["sts:ExternalId"];
            }
            return accountDetails;
        });
        return roleAccountsObject;
    }

    private getAccountIDs(arns: string | string[]) {
        const arnsArray = CommonUtil.toArray(arns);
        return arnsArray.map((arn) => {
            return arn.split(":")[4];
        });
    }

    private removeAccountIDFromList(accountIds, accountIdToBeRemoved) {
        if (!accountIds || !accountIds.length) {
            return [];
        } else {
            return accountIds.filter((accountId) => {
                return accountId !== accountIdToBeRemoved;
            });
        }
    }
}
