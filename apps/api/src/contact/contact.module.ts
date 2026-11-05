import {Module} from '@nestjs/common';
import {ContactController} from './contact.controller';
import {ContactService} from './contact.service';
import {SuperAdminAuthGuard} from '../superadmin-auth/superadmin-auth.guard';

@Module({controllers:[ContactController],providers:[ContactService,SuperAdminAuthGuard]})
export class ContactModule {}
