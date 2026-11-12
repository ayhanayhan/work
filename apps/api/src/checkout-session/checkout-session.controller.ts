import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CheckoutSessionService } from './checkout-session.service';

@Controller('storefront/checkout-sessions')
export class CheckoutSessionController {
  constructor(private readonly service: CheckoutSessionService) {}

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Get(':id')
  resolve(@Param('id') id: string) {
    return this.service.resolve(id);
  }
}
