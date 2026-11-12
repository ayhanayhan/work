export type EDocumentStatus='QUEUED'|'SENDING'|'SENT'|'DELIVERED'|'ACCEPTED'|'REJECTED'|'FAILED'|'CANCELLED'|'CANCELLATION_REQUESTED'|'RECEIVED'|string;
export type ProviderContext={storeId:string;connectionId:string;credentials:Record<string,any>;config:Record<string,any>};
export type DocumentRef={externalId?:string;uuid?:string};
export interface EDocumentProvider{
 code:string; name:string;
 checkTaxpayer?(ctx:ProviderContext,taxId:string):Promise<any>;
 sendInvoice(ctx:ProviderContext,doc:any):Promise<any>;
 getOutgoingStatus(ctx:ProviderContext,ref:DocumentRef):Promise<any>;
 cancelEArchive?(ctx:ProviderContext,ref:DocumentRef,reason?:string):Promise<any>;
 requestCancellation?(ctx:ProviderContext,ref:DocumentRef,reason?:string):Promise<any>;
 listIncoming?(ctx:ProviderContext,q:any):Promise<{items:any[];cursor?:string}>;
 respondCommercial?(ctx:ProviderContext,ref:DocumentRef,response:'ACCEPT'|'REJECT',note?:string):Promise<any>;
 getPdf?(ctx:ProviderContext,ref:DocumentRef):Promise<any>;
 getXml?(ctx:ProviderContext,ref:DocumentRef):Promise<any>;
}
