import {Module} from '@nestjs/common';
import {PrismaModule} from '../prisma/prisma.module';
import {IntegrationsModule} from '../integrations/integrations.module';
import {EDocumentProviderRegistry} from './edoc.registry';
import {EDocumentService} from './edoc.service';
@Module({imports:[PrismaModule,IntegrationsModule],providers:[EDocumentProviderRegistry,EDocumentService],exports:[EDocumentService,EDocumentProviderRegistry]})
export class EDocumentModule{}
