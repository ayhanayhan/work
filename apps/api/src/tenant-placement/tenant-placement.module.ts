import {Global,Module} from '@nestjs/common';
import {PrismaModule} from '../prisma/prisma.module';
import {TenantPlacementService} from './tenant-placement.service';
import {TenantCellMigrationService} from './tenant-cell-migration.service';
import {TenantDataCopyService} from './tenant-data-copy.service';
import {CapacityPlannerService} from './capacity-planner.service';
import {CellProvisioningService} from './cell-provisioning.service';

@Global()
@Module({imports:[PrismaModule],providers:[TenantPlacementService,TenantCellMigrationService,TenantDataCopyService,CapacityPlannerService,CellProvisioningService],exports:[TenantPlacementService,TenantCellMigrationService,TenantDataCopyService,CapacityPlannerService,CellProvisioningService]})
export class TenantPlacementModule{}
