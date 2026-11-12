import {apiError} from '../i18n/api-error';
import { apiText } from '../i18n/api-i18n';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { EDocumentProviderRegistry } from './edoc.registry';
import { canonicalFromOrder } from './edoc.mapper';
import type { EDocumentStatus, ProviderContext } from './edoc.types';

@Injectable()
export class EDocumentService {
  constructor(private prisma:PrismaService,private integrations:IntegrationsService,private registry:EDocumentProviderRegistry){}
  providers(){return this.registry.list()}
  private async ctx(storeId:string,providerCode?:string):Promise<{provider:any;ctx:ProviderContext;connection:any}>{
    let row:any;
    if(providerCode) row=await this.integrations.internalProviderConnection(storeId,providerCode);
    else row=await this.prisma.integrationConnection.findFirst({where:{tenantId:storeId,type:'INVOICE',enabled:true},orderBy:{createdAt:'asc'}});
    if(!row)throw new BadRequestException(apiError('edoc.integration.missing'));
    const connection=providerCode?row:await this.integrations.internalProviderConnection(storeId,row.provider);
    if(!connection)throw new BadRequestException(apiError('edoc.integration.disabled'));
    return{provider:this.registry.get(connection.provider),ctx:{storeId,connectionId:connection.id,credentials:connection.credentials||{},config:(connection.config||{}) as any},connection};
  }
  private async event(documentId:string,status:EDocumentStatus,r:any,message?:string){return this.prisma.eDocumentEvent.create({data:{documentId,status,providerStatus:r?.providerStatus||null,providerStatusCode:r?.providerStatusCode||null,gibStatusCode:r?.gibStatusCode||null,message:message||null,payload:(r?.raw||null) as any}})}
  async list(storeId:string,q:any={}){return this.prisma.eDocument.findMany({where:{storeId,...(q.orderId?{orderId:String(q.orderId)}:{}),...(q.direction?{direction:q.direction}:{}),...(q.status?{status:q.status}:{})},orderBy:{createdAt:'desc'},take:Math.min(200,Math.max(1,Number(q.limit||50)))})}
  async get(storeId:string,id:string){const d=await this.prisma.eDocument.findFirst({where:{id,storeId},include:{events:{orderBy:{createdAt:'desc'}}}});if(!d)throw new NotFoundException(apiError('edoc.notFound'));return d}
  async checkTaxpayer(storeId:string,taxId:string,providerCode?:string){const{provider,ctx}=await this.ctx(storeId,providerCode);if(!provider.checkTaxpayer)throw new BadRequestException(apiError('edoc.taxpayer.unsupported'));return provider.checkTaxpayer(ctx,taxId)}
  async createForOrder(storeId:string,orderId:string,b:any){
    const order=await this.prisma.order.findFirst({where:{id:orderId,storeId},include:{items:true,customer:true,store:true}});if(!order)throw new NotFoundException(apiError('common.order.notFound'));
    const{provider,ctx,connection}=await this.ctx(storeId,b.provider); const rules:any=ctx.config||{}; const requested=String(b.documentType||rules.documentType||rules.taxpayerMode||'AUTO').toUpperCase(); let documentType:any=requested==='AUTO'?'AUTO':requested;
    let scenario=String(b.scenario||''); const billing:any=order.billingAddress||{}; const tax=String(billing.taxNumber||billing.vkn||billing.tckn||'').replace(/\D/g,'').trim(); const isB2B=tax.length===10;
    if(documentType==='AUTO'){let registered=false;if(tax&&provider.checkTaxpayer){try{registered=!!(await provider.checkTaxpayer(ctx,tax)).registered}catch{registered=false}}documentType=registered?'E_INVOICE':'E_ARCHIVE';if(registered){const mode=String(isB2B?(rules.b2bMode||'COMMERCIAL'):(rules.scenario||'BASIC')).toUpperCase();scenario=mode==='COMMERCIAL'?'TICARIFATURA':'TEMELFATURA'}else scenario='EARSIVFATURA'}
    if(!['E_INVOICE','E_ARCHIVE'].includes(documentType))throw new BadRequestException(apiError('edoc.documentType.invalid'));
    if(!scenario){if(documentType==='E_ARCHIVE')scenario='EARSIVFATURA';else{const mode=String(isB2B?(rules.b2bMode||rules.scenario||'BASIC'):(rules.b2cMode==='ARCHIVE'?'BASIC':rules.scenario||'BASIC')).toUpperCase();scenario=mode==='COMMERCIAL'?'TICARIFATURA':'TEMELFATURA'}}
    const invoiceTypeCode=String(b.invoiceTypeCode||rules.invoiceType||'SALE').toUpperCase()==='SALE'?'SATIS':String(b.invoiceTypeCode||rules.invoiceType||'SATIS');
    const canonical=canonicalFromOrder(order,order.store,{documentType,scenario,invoiceTypeCode,billingReference:b.billingReference});
    const doc=await this.prisma.eDocument.create({data:{storeId,orderId,provider:provider.code,connectionId:connection.id,direction:'OUTGOING',type:documentType,scenario,invoiceTypeCode:canonical.invoiceTypeCode,localReferenceId:canonical.localReferenceId,status:'QUEUED',issueDate:new Date(canonical.issueDate),currency:canonical.currency,totalNet:canonical.totals.net,totalTax:canonical.totals.tax,totalGross:canonical.totals.gross,rawSnapshot:canonical as any}});await this.event(doc.id,'QUEUED',{},'Gönderim kuyruğuna alındı');
    try{await this.prisma.eDocument.update({where:{id:doc.id},data:{status:'SENDING'}});const r=await provider.sendInvoice(ctx,canonical);const status=(r.normalizedStatus||'SENT') as EDocumentStatus;const updated=await this.prisma.eDocument.update({where:{id:doc.id},data:{externalId:r.externalId||null,uuid:r.uuid||null,documentNumber:r.documentNumber||null,status,providerStatus:r.providerStatus||null,providerStatusCode:r.providerStatusCode||null,gibStatusCode:r.gibStatusCode||null,lastSyncedAt:new Date(),metadata:{providerResponse:r.raw} as any}});await this.event(doc.id,status,r,'Sağlayıcıya gönderildi');return updated}catch(e:any){await this.prisma.eDocument.update({where:{id:doc.id},data:{status:'FAILED',metadata:{error:String(e?.message||e)} as any}});await this.event(doc.id,'FAILED',{},String(e?.message||e));throw e}
  }
  async maybeAutoCreateForOrder(storeId:string,orderId:string,event:'PAYMENT_PAID'|'FULFILLMENT_SHIPPED'){
    const policyStore:any=await this.prisma.tenant.findUnique({where:{id:storeId},select:{settings:true}});
    const taxInvoicePolicy:any=(policyStore?.settings as any)?.taxInvoicePolicy||{};
    if(taxInvoicePolicy.autoCreateInvoice!==true)return{skipped:true,reason:'AUTO_CREATE_INVOICE_DISABLED'};

    const connection=await this.prisma.integrationConnection.findFirst({where:{tenantId:storeId,type:'INVOICE',enabled:true},orderBy:{createdAt:'asc'}});
    if(!connection)return null;
    const config:any=connection.config&&typeof connection.config==='object'?connection.config:{};
    if(String(config.invoiceTrigger||'MANUAL').toUpperCase()!==event)return null;
    const existing=await this.prisma.eDocument.findFirst({where:{storeId,orderId,direction:'OUTGOING',type:{in:['E_INVOICE','E_ARCHIVE']},status:{notIn:['FAILED','CANCELLED']}}});
    if(existing)return existing;
    try{return await this.createForOrder(storeId,orderId,{provider:connection.provider})}catch{return null}
  }
  async refresh(storeId:string,id:string){const d=await this.get(storeId,id);const{provider,ctx}=await this.ctx(storeId,d.provider);const r=await provider.getOutgoingStatus(ctx,{externalId:d.externalId||undefined,uuid:d.uuid||undefined});const status=(r.normalizedStatus||d.status) as EDocumentStatus;const u=await this.prisma.eDocument.update({where:{id},data:{status,providerStatus:r.providerStatus||d.providerStatus,providerStatusCode:r.providerStatusCode||d.providerStatusCode,gibStatusCode:r.gibStatusCode||d.gibStatusCode,lastSyncedAt:new Date()}});await this.event(id,status,r,'Durum senkronize edildi');return u}
  async cancel(storeId:string,id:string,b:any){const d=await this.get(storeId,id);const{provider,ctx}=await this.ctx(storeId,d.provider);let r:any;if(d.type==='E_ARCHIVE'&&provider.cancelEArchive)r=await provider.cancelEArchive(ctx,{externalId:d.externalId||undefined,uuid:d.uuid||undefined},b.reason);else if(provider.requestCancellation)r=await provider.requestCancellation(ctx,{externalId:d.externalId||undefined,uuid:d.uuid||undefined},b.reason);else throw new BadRequestException(apiError('edoc.cancel.unsupported'));const st=(r.normalizedStatus||'CANCELLATION_REQUESTED') as EDocumentStatus;const u=await this.prisma.eDocument.update({where:{id},data:{status:st,lastSyncedAt:new Date()}});await this.event(id,st,r,b.reason||apiText('edoc.event.cancelStarted'));return u}
  async syncIncoming(storeId:string,b:any){const{provider,ctx}=await this.ctx(storeId,b.provider);if(!provider.listIncoming)throw new BadRequestException(apiError('edoc.incoming.unsupported'));const c=await this.prisma.eDocumentSyncCursor.upsert({where:{storeId_provider_direction:{storeId,provider:provider.code,direction:'INCOMING'}},create:{storeId,provider:provider.code,direction:'INCOMING'},update:{}});const r=await provider.listIncoming(ctx,{since:b.since||c.lastSyncedAt?.toISOString(),until:b.until,cursor:b.cursor||c.cursor||undefined,limit:b.limit||100});let inserted=0;for(const x of r.items){if(!x.uuid&&!x.externalId)continue;const found=await this.prisma.eDocument.findFirst({where:{storeId,provider:provider.code,OR:[...(x.uuid?[{uuid:x.uuid}]:[]),...(x.externalId?[{externalId:x.externalId}]:[])]}});if(found)continue;const d=await this.prisma.eDocument.create({data:{storeId,provider:provider.code,connectionId:ctx.connectionId,direction:'INCOMING',type:'E_INVOICE',status:'RECEIVED',externalId:x.externalId||null,uuid:x.uuid||null,documentNumber:x.documentNumber||null,providerStatus:x.providerStatus||null,providerStatusCode:x.providerStatusCode||null,gibStatusCode:x.gibStatusCode||null,issueDate:x.issueDate?new Date(x.issueDate):null,currency:x.currency||'TRY',totalGross:x.totalGross||null,metadata:{senderTaxId:x.senderTaxId,senderTitle:x.senderTitle,raw:x.raw} as any}});await this.event(d.id,'RECEIVED',x,apiText('edoc.event.incomingFetched'));inserted++}await this.prisma.eDocumentSyncCursor.update({where:{id:c.id},data:{cursor:r.cursor||c.cursor,lastSyncedAt:new Date()}});return{ok:true,received:r.items.length,inserted,cursor:r.cursor}}
  async respondIncoming(storeId:string,id:string,b:any){const d=await this.get(storeId,id);if(d.direction!=='INCOMING')throw new BadRequestException(apiError('edoc.incoming.only'));const{provider,ctx}=await this.ctx(storeId,d.provider);if(!provider.respondCommercial)throw new BadRequestException(apiError('edoc.commercial.unsupported2'));const response=String(b.response||'').toUpperCase();if(!['ACCEPT','REJECT'].includes(response))throw new BadRequestException(apiError('edoc.response.invalid'));const r=await provider.respondCommercial(ctx,{externalId:d.externalId||undefined,uuid:d.uuid||undefined},response as any,b.note);const st=(r.normalizedStatus||(response==='ACCEPT'?'ACCEPTED':'REJECTED')) as EDocumentStatus;const u=await this.prisma.eDocument.update({where:{id},data:{status:st,lastSyncedAt:new Date()}});await this.event(id,st,r,b.note);return u}
  async binary(storeId:string,id:string,kind:'pdf'|'xml'){const d=await this.get(storeId,id);const{provider,ctx}=await this.ctx(storeId,d.provider);const fn=kind==='pdf'?provider.getPdf:provider.getXml;if(!fn)throw new BadRequestException(`${kind.toUpperCase()} indirme desteklenmiyor`);return fn.call(provider,ctx,{externalId:d.externalId||undefined,uuid:d.uuid||undefined})}
}
