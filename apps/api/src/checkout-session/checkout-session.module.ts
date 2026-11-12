import { Module } from '@nestjs/common';
import { CheckoutSessionController } from './checkout-session.controller';
import { CheckoutSessionService } from './checkout-session.service';

@Module({ controllers: [CheckoutSessionController], providers: [CheckoutSessionService] })
export class CheckoutSessionModule {}
