import {Body,Controller,Get,Param,Post,UseGuards} from '@nestjs/common';
import {CurrentTenant} from '../common/request.decorator';
import {PermissionGuard} from '../common/permission.guard';
import {RequirePermission} from '../common/permissions';
import {TenantGuard} from '../common/tenant.guard';
import {MerchantAuthGuard} from '../merchant-auth/merchant-auth.guard';
import {ShippingService} from './shipping.service';
import type {ShippingProviderCode} from './shipping.types';
@UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
@RequirePermission('settings.manage')
@Controller('admin/shipping')
export class ShippingAdminController{
 constructor(private svc:ShippingService){}
 @Get('connections/:provider') connection(@CurrentTenant() t:string,@Param('provider') p:ShippingProviderCode){return this.svc.connection(t,p)}
 @Post('connections/:provider') save(@CurrentTenant() t:string,@Param('provider') p:ShippingProviderCode,@Body() b:any){return this.svc.saveConnection(t,p,b)}
 @Post('connections/:provider/test') test(@CurrentTenant() t:string,@Param('provider') p:ShippingProviderCode){return this.svc.testConnection(t,p)}
 @Post('orders/:orderId/shipments/:provider') create(@CurrentTenant() t:string,@Param('orderId') o:string,@Param('provider') p:ShippingProviderCode,@Body() b:any){return this.svc.createForOrder(t,o,p,b)}
 @Get('orders/:orderId/shipments') list(@CurrentTenant() t:string,@Param('orderId') o:string){return this.svc.listForOrder(t,o)}
 @Post('shipments/:id/sync') sync(@CurrentTenant() t:string,@Param('id') id:string){return this.svc.syncShipment(t,id)}
 @Post('shipments/:id/cancel') cancel(@CurrentTenant() t:string,@Param('id') id:string){return this.svc.cancelShipment(t,id)}
}
