import * as Moment from "moment";
import {
    CheckAnalysisType, ICheckAnalysisResult, IDictionary,
    IResourceAnalysisResult, SeverityStatus,
} from "../../../types";
import { ResourceUtil } from "../../../utils";
import { BaseAnalyzer } from "../../base";

export class VolumeSnapshotsRegularityAnalyzer extends BaseAnalyzer {
    public checks_what : string = "Are Snapshots being taken for EBS volumes?";
    public checks_why : string = `If we take regular snapshots of EBS volumes
    then it prevents data loss incase of volume failure or accidental deletes`;
    public checks_recommendation: string = "Recommended to take regular snapshots for all in-use volumes";
    public checks_name : string = "Table";
    public analyze(params: any, fullReport?: any): any {
        const allVolumes = params.volumes;
        const allSnapshots = params.snapshots;

        if (!allVolumes || !allSnapshots) {
            return undefined;
        }
        const currentMoment = Moment();
        const volume_snapshots_regularity: ICheckAnalysisResult = { type: CheckAnalysisType.Reliability };
        volume_snapshots_regularity.what = this.checks_what;
        volume_snapshots_regularity.why = this.checks_why;
        volume_snapshots_regularity.recommendation = this.checks_recommendation;
        const allRegionsAnalysis: IDictionary<IResourceAnalysisResult[]> = {};
        for (const region in allVolumes) {
            const regionVolumes = allVolumes[region];
            allRegionsAnalysis[region] = [];
            for (const volume of regionVolumes) {
                if (volume.State !== "in-use") {
                    continue;
                }
                const volumeAnalysis: IResourceAnalysisResult = {};
                volumeAnalysis.resource = { volume, snapshots: allSnapshots[region][volume.VolumeId] };
                volumeAnalysis.resourceSummary = {
                    name: this.checks_name,
                    value: `${ResourceUtil.getNameByTags(volume)} | ${volume.VolumeId}`,
                };
                const latestSnapshot = this.getLatestSnapshot(allSnapshots[region][volume.VolumeId]);
                if (latestSnapshot) {
                    const lastSnapshotDate = Moment(latestSnapshot.StartTime);
                    const lastSnapshotInDays = Math.floor(Moment.duration(Moment().
                        diff(Moment(lastSnapshotDate))).asDays());
                    if (lastSnapshotInDays <= 7) {
                        volumeAnalysis.severity = SeverityStatus.Good;
                        volumeAnalysis.message = `Last snapshot was taken ${lastSnapshotInDays} days ago`;
                    } else {
                        volumeAnalysis.severity = SeverityStatus.Warning;
                        volumeAnalysis.message = `Last snapshot was taken ${lastSnapshotInDays} days ago`;
                        volumeAnalysis.action = "Take daily snapshot for in-use volumes";
                    }

                } else {
                    volumeAnalysis.severity = SeverityStatus.Failure;
                    volumeAnalysis.message = "No snapshots from last 30 days";
                    volumeAnalysis.action = "Take daily snapshot for in-use volumes";
                }
                allRegionsAnalysis[region].push(volumeAnalysis);
            }
        }
        volume_snapshots_regularity.regions = allRegionsAnalysis;
        return { volume_snapshots_regularity };
    }

    private getLatestSnapshot(snapshots: any[]) {
        if (!snapshots) {
            return undefined;
        }
        return snapshots.sort((snapshot1, snapshot2) => {
            if (snapshot1.StartTime < snapshot2.StartTime) {
                return 1;
            } else if (snapshot1.StartTime > snapshot2.StartTime) {
                return -1;
            } else {
                return 0;
            }
        })[0];
    }
}
