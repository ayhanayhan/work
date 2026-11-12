import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { MediaModule } from '../media/media.module';
import { BillingModule } from '../billing/billing.module';
@Module({imports:[IntegrationsModule,MediaModule,BillingModule],controllers:[AiController],providers:[AiService]})
export class AiModule {}
