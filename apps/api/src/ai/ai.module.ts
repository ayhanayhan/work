import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { MediaModule } from '../media/media.module';
@Module({imports:[IntegrationsModule,MediaModule],controllers:[AiController],providers:[AiService]})
export class AiModule {}
