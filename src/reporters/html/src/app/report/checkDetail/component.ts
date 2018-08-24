import { ArrayUtil } from './../../../utils/array';
import { Component, OnInit, ViewChild } from '@angular/core';
import { CloudReportService } from '../report.service'
import { ActivatedRoute, Router } from '@angular/router';
import { MatSort, MatPaginator, MatTableDataSource } from '@angular/material';

@Component({
    selector: 'app-cloud-report-check-detail',
    templateUrl: 'component.html',
    styleUrls: ['component.scss']
})
export class CloudReportCheckDetailComponent implements OnInit {

    displayedColumns = [
        'service',
        'checkCategory',
        'region',
        'resourceName',
        'resourceValue',
        'message',
        'severity',
        'action'
    ];
    dataSource;
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    resultLength = 0;
    services: string[];
    selectedService: string;
    serviceCheckCategories: string[];
    selectedServiceCheckCategory: string;
    regions: string[];
    selectedRegion: string;
    hasNoRegions = true;
    selectedSeverity: string[];
    tableData: any[];
    scanReportData: Object;
    removable: boolean = true;

    filterSelections: Object[];

    constructor(
        private cloudReportService: CloudReportService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit() {
        this.loadCheckDetailPageData();
    }

    private getServiceKey(provider = "aws") {
        return this.selectedService ? provider + '.' + this.selectedService : undefined;
    }

    loadCheckDetailPageData() {
        this.route.queryParams.subscribe((urlData) => {
            this.cloudReportService.getScanReportData()
                .subscribe((data) => {
                    this.scanReportData = data;

                    // Auto select
                    this.selectedService = urlData['service'];
                    this.selectedServiceCheckCategory = urlData['checkCategory'];
                    this.selectedRegion = urlData['region'];
                    this.selectedSeverity = ArrayUtil.toArray(urlData['severity']);

                    console.log('selected service: ' + this.selectedService + ', selected check category: ' + this.selectedServiceCheckCategory + ', selected region: ' + this.selectedRegion + ', selected severity: ' + this.selectedSeverity);

                    const serviceKey = this.getServiceKey();
                    const filteredReportData = this.cloudReportService.getCheckDetailData(data, serviceKey, this.selectedServiceCheckCategory, this.selectedRegion, this.selectedSeverity);
                    console.log('filtered data', filteredReportData);

                    // Handle services
                    this.handleServices(data);

                    // Handle service check categories
                    this.handleServiceCheckCategories(filteredReportData);

                    // Handle regions
                    this.handleRegions(data);

                    this.tableData = this.makeTableData(filteredReportData);
                    this.dataSource = new MatTableDataSource(this.tableData);
                    this.resultLength = this.tableData.length;
                    this.dataSource.paginator = this.paginator;
                    this.dataSource.sort = this.sort;
                }, (error) => {
                    console.log(error);
                });
        });
    }

    // Handle dropdown services
    handleServices(reportData) {
        if (this.selectedRegion) {
            console.log('calling getServicesByRegion')
            this.services = this.cloudReportService.getServicesByRegion(reportData, this.selectedRegion);
        }
        else if (!this.selectedRegion) {
            console.log('calling getServices')
            this.services = this.cloudReportService.getServices(reportData);
        }
        console.log('Dropdown services: ', this.services);
    }

    handleServiceCheckCategories(data) { }

    handleRegions(data) {
        this.regions = this.cloudReportService.getRegions();
        console.log('Dropdown regions: ', this.regions);
    }

    applyFilter(filterValue: string) {
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    changeService() {
        this.selectedServiceCheckCategory = undefined;
        this.reload();
    }

    changeServiceCheckCategories() {
        this.reload();
    }

    changeRegion() {
        this.reload();
    }

    reload() {
        // console.log('all data is present, selectedService = ' + this.selectedService + ' or selectedServiceCheckCategory = ' + this.selectedServiceCheckCategory + ' or selectedServiceCheckCategoryRegion =' + this.selectedRegion + ' or selectedSeverity =' + this.selectedSeverity + ' and reloading page');
        if (!ArrayUtil.isNotBlank(this.selectedSeverity)) {
            this.selectedSeverity = undefined;
        }
        // this.storeFliterSelectionData({
        //     checkCategory: this.selectedServiceCheckCategory,
        //     region: this.selectedRegion,
        //     service: this.selectedService,
        //     severity: this.selectedSeverity
        // });
        this.router.navigate(['/report/checkDetail'], {
            queryParams: {
                checkCategory: this.selectedServiceCheckCategory,
                region: this.selectedRegion,
                service: this.selectedService,
                severity: this.selectedSeverity
            }
        });
    }

    goToServiceDashboard() {
        this.router.navigate(['/report/checkCategory', this.selectedService]);
    }

    private makeTableData(filteredDataObject: any) {
        const tableData = [];
        if (filteredDataObject && typeof filteredDataObject === 'object') {
            for (let serviceObjectKey in filteredDataObject) {
                for (let checkCategoryObjectKey in filteredDataObject[serviceObjectKey]) {
                    const regionsObject = filteredDataObject[serviceObjectKey][checkCategoryObjectKey].regions;
                    for (let regionsObjectKey in regionsObject) {
                        for (let i = 0; i < regionsObject[regionsObjectKey].length; i++) {
                            regionsObject[regionsObjectKey][i]['service'] = serviceObjectKey.split('.')[1];
                            regionsObject[regionsObjectKey][i]['checkCategory'] = checkCategoryObjectKey;
                            regionsObject[regionsObjectKey][i]['region'] = regionsObjectKey;
                            if (regionsObject[regionsObjectKey][i].hasOwnProperty('action')) {
                                regionsObject[regionsObjectKey][i]['action'] = regionsObject[regionsObjectKey][i].action;
                            }
                            else {
                                regionsObject[regionsObjectKey][i]['action'] = '----';
                            }
                            tableData.push(regionsObject[regionsObjectKey][i]);
                        }
                    }
                }
            }
        }
        // console.log('table data: ', tableData);

        return tableData;
    }

    showService(service) {
        return service.split('.')[1];
    }

}
