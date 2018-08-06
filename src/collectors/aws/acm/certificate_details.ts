import * as AWS from 'aws-sdk';
import { BaseCollector } from "../../base";
import { CertificateCollector } from "./certificates"
import { CollectorUtil } from "../../../utils";
import { LogUtil } from '../../../utils/log';

export class CertificateDetailsCollector extends BaseCollector {
    collect() {
        return this.getAllCertificateDetails();
    }

    private async getAllCertificateDetails() {
        const self = this;
        const serviceName = 'ACM';
        const acmRegions = self.getRegions(serviceName);
        const certificatesData = await CollectorUtil.cachedCollect(new CertificateCollector());
        const certificates = certificatesData.certificates;
        const certificate_details = {};
        for (let region of acmRegions) {
            try {
                let acmService = self.getClient(serviceName, region) as AWS.ACM;
                let regionCertificates = certificates[region];
                let allRegionCertificateDetails: AWS.ACM.CertificateDetail[] = [];
                for (let certificate of regionCertificates) {
                    let regionCertificateDetails: AWS.ACM.DescribeCertificateResponse = await acmService.describeCertificate({ CertificateArn: certificate.CertificateArn }).promise();
                    if (regionCertificateDetails.Certificate) {
                        allRegionCertificateDetails.push(regionCertificateDetails.Certificate);
                    }
                }
                certificate_details[region] = allRegionCertificateDetails;
            } catch (error) {
                LogUtil.error(error);
                continue;
            }
        }
        return { certificate_details };
    }
}