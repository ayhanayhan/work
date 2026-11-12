import { Module } from '@nestjs/common';
import { MerchantAuthController } from './merchant-auth.controller';
import { MerchantAuthService } from './merchant-auth.service';
import { EmailModule } from '../email/email.module';

@Module({ imports:[EmailModule],controllers: [MerchantAuthController], providers: [MerchantAuthService], exports: [MerchantAuthService] })
export class MerchantAuthModule {}
