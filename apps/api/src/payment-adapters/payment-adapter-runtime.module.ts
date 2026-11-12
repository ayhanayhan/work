import { Module } from '@nestjs/common';
import { PaymentAdapterRuntimeService } from './payment-adapter-runtime.service';

@Module({ providers: [PaymentAdapterRuntimeService], exports: [PaymentAdapterRuntimeService] })
export class PaymentAdapterRuntimeModule {}
