export type ShippingProviderCode='MANUAL'|'YURTICI'|'ARAS'|'SURAT'|'PTT'|'UPS';
export type AddressInput={fullName:string;company?:string;addressLine:string;city:string;district:string;postalCode?:string;phone:string;email?:string};
export type CreateShipmentInput={referenceId:string;sender:AddressInput;receiver:AddressInput;parcel:{weightGrams:number;desi?:number;pieceCount:number;content?:string};note?:string};
export interface ShippingAdapter{
 capabilities:{create:boolean;track:boolean;cancel:boolean};
 testConnection():Promise<{ok:boolean;message:string;raw?:any}>;
 createShipment(input:CreateShipmentInput):Promise<{externalShipmentId?:string;trackingNumber?:string;label?:{format?:string;data?:string};raw?:any}>;
 trackShipment(trackingCode:string,externalShipmentId?:string):Promise<{status:string;rawStatus?:string;events:Array<{status:string;code?:string;description:string;location?:string;occurredAt:Date;raw?:any}>;raw?:any}>;
 cancelShipment(trackingCode:string,externalShipmentId?:string):Promise<{cancelled:boolean;raw?:any}>;
}
