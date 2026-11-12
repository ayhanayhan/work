import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantPlacementModule } from '../tenant-placement/tenant-placement.module';
import { CellRoutingMiddleware } from './cell-routing.middleware';

@Global()
@Module({imports:[PrismaModule,TenantPlacementModule],providers:[CellRoutingMiddleware],exports:[CellRoutingMiddleware]})
export class CellRoutingModule{}
