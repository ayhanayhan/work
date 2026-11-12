import { Body, Controller, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../../common/request.decorator';
import { RequirePermission } from '../../common/permissions';
import { MerchantAuthGuard } from '../../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { PaymentProvidersService } from './stripe-payment.service';

@Controller('payment-providers')
export class PaymentProvidersController {
  constructor(private svc:PaymentProvidersService){}

  @Post('stripe/attempts/:attemptId/start')
  start(@Param('attemptId') attemptId:string,@Body() body:any){return this.svc.startStripe(attemptId,String(body?.token||''));}

  @Post('stripe/attempts/:attemptId/status')
  status(@Param('attemptId') attemptId:string,@Body() body:any){return this.svc.stripeStatus(attemptId,String(body?.token||''));}

  @Post('stripe/webhook')
  stripeWebhook(@Req() req:any,@Headers('stripe-signature') signature?:string){return this.svc.stripeWebhook(String(req.body||''),String(signature||''));}

  @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
  @RequirePermission('orders.manage')
  @Post('stripe/orders/:orderId/reconcile')
  reconcile(@CurrentTenant() tenantId:string,@Param('orderId') orderId:string){return this.svc.reconcileStripeOrder(tenantId,orderId);}

  @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
  @RequirePermission('orders.manage')
  @Post('stripe/orders/:orderId/capture')
  capture(@CurrentTenant() tenantId:string,@Param('orderId') orderId:string,@Body() body:any){return this.svc.captureStripeOrder(tenantId,orderId,body);}

  @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
  @RequirePermission('orders.manage')
  @Post('stripe/orders/:orderId/cancel')
  cancel(@CurrentTenant() tenantId:string,@Param('orderId') orderId:string,@Body() body:any){return this.svc.cancelStripeOrder(tenantId,orderId,body);}

  @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
  @RequirePermission('orders.manage')
  @Post('stripe/orders/:orderId/refund')
  refund(@CurrentTenant() tenantId:string,@Param('orderId') orderId:string,@Body() body:any){return this.svc.refundStripeOrder(tenantId,orderId,body);}
  @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
  @RequirePermission('orders.manage')
  @Post('stripe/orders/:orderId/refunds/:transactionId/reconcile')
  reconcileRefund(@CurrentTenant() tenantId:string,@Param('orderId') orderId:string,@Param('transactionId') transactionId:string){return this.svc.reconcileStripeRefund(tenantId,orderId,transactionId);}

}
