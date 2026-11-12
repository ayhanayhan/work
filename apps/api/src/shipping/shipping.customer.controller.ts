import {Controller,Get,Param,Req,UseGuards} from '@nestjs/common';
import {CustomerGuard} from '../common/customer.guard';
import {ShippingService} from './shipping.service';
@UseGuards(CustomerGuard)
@Controller('storefront/customer')
export class ShippingCustomerController{
 constructor(private svc:ShippingService){}
 @Get('orders/:orderId/shipments') list(@Req() req:any,@Param('orderId') orderId:string){return this.svc.customerOrderShipments(String(req.customer?.sub||''),orderId)}
}
