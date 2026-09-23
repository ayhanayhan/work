import { Module } from '@nestjs/common';
import { MerchantAuthController } from './merchant-auth.controller';
import { MerchantAuthService } from './merchant-auth.service';

@Module({ controllers: [MerchantAuthController], providers: [MerchantAuthService], exports: [MerchantAuthService] })
export class MerchantAuthModule {}
