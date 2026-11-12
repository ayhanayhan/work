import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShippingModule } from '../shipping/shipping.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { OperationsWorkerController } from './operations-worker.controller';
import { OperationsWorkerService } from './operations-worker.service';
import {BullMqWorkerService} from './bullmq-worker.service';
import { WorkerAuthGuard } from './worker-auth.guard';
import { EmailModule } from '../email/email.module';
import { MerchantModule } from '../merchant/merchant.module';
@Module({imports:[PrismaModule,ShippingModule,WebhooksModule,EmailModule,MerchantModule],controllers:[OperationsWorkerController],providers:[OperationsWorkerService,BullMqWorkerService,WorkerAuthGuard],exports:[OperationsWorkerService]})
export class OperationsWorkerModule{}
