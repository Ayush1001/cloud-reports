import * as AWS from 'aws-sdk';
import { BaseCollector } from "../../base";
import { CollectorUtil } from '../../../utils';
import { ESDomainNamesCollector } from './domain_names';

export class ESDomainsCollector extends BaseCollector {
    collect() {
        return this.getAllDomains();
    }

    private async getAllDomains() {

        const serviceName = 'ES';
        const esRegions = this.getRegions(serviceName);
        const domainNamesData = await CollectorUtil.cachedCollect(new ESDomainNamesCollector());
        const domainNames = domainNamesData.domain_names;
        const domains = {};

        for (let region of esRegions) {
            if(!domainNames[region]) {
                continue;
            }
            try {
                let es = this.getClient(serviceName, region) as AWS.ES;
                const domainsResponse: AWS.ES.DescribeElasticsearchDomainsResponse = await es.describeElasticsearchDomains({ DomainNames: domainNames[region] }).promise();
                if (domainsResponse && domainsResponse.DomainStatusList) {
                    domains[region] = domainsResponse.DomainStatusList;
                }
            } catch (error) {
                console.error(error);
                continue;
            }
        }
        return { domains };
    }
}