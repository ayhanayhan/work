import { Module } from '@nestjs/common';
import { CustomerGuard } from '../common/customer.guard';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
@Module({ controllers: [StorefrontController], providers: [StorefrontService, CustomerGuard] })
export class StorefrontModule {}
