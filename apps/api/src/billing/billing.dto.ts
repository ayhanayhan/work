import {Type} from 'class-transformer';
import {IsIn,IsInt,IsNotEmpty,IsObject,IsOptional,IsString,Max,MaxLength,Min,ValidateNested} from 'class-validator';

export class BillingBuyerDto{
  @IsOptional() @IsString() @MaxLength(120) name?:string;
  @IsOptional() @IsString() @MaxLength(20) identityNumber?:string;
  @IsOptional() @IsString() @MaxLength(40) phone?:string;
  @IsOptional() @IsString() @MaxLength(240) address?:string;
  @IsOptional() @IsString() @MaxLength(100) city?:string;
  @IsOptional() @IsString() @MaxLength(20) zipCode?:string;
  @IsOptional() @IsString() @MaxLength(80) country?:string;
  @IsOptional() @IsString() @MaxLength(160) companyName?:string;
  @IsOptional() @IsString() @MaxLength(80) taxOffice?:string;
}

export class PlanCheckoutDto{
  @IsString() @IsNotEmpty() planId!:string;
  @IsOptional() @IsIn(['MONTHLY','YEARLY']) billing?:'MONTHLY'|'YEARLY';
  @IsOptional() @IsString() @MaxLength(64) couponCode?:string;
  @IsOptional() @ValidateNested() @Type(()=>BillingBuyerDto) buyer?:BillingBuyerDto;
}

export class ThemeCheckoutDto{
  @IsString() @IsNotEmpty() themeId!:string;
  @IsOptional() @IsString() @MaxLength(64) couponCode?:string;
  @IsOptional() @ValidateNested() @Type(()=>BillingBuyerDto) buyer?:BillingBuyerDto;
}

export class PlatformCheckoutDto{
  @IsIn(['APP','AI_CREDIT','EMAIL_CREDIT']) kind!:'APP'|'AI_CREDIT'|'EMAIL_CREDIT';
  @IsString() @IsNotEmpty() targetId!:string;
  @IsOptional() @IsInt() @Min(1) @Max(100) quantity?:number;
  @IsOptional() @IsString() @MaxLength(64) couponCode?:string;
  @IsOptional() @ValidateNested() @Type(()=>BillingBuyerDto) buyer?:BillingBuyerDto;
}

export class IyzicoCallbackDto{
  @IsString() @IsNotEmpty() token!:string;
}


export class IyzicoWebhookDto{
  @IsString() @IsNotEmpty() paymentConversationId!:string;
  @IsString() @IsNotEmpty() status!:string;
  @IsString() @IsNotEmpty() token!:string;
  @IsString() @IsNotEmpty() iyziEventType!:string;
  @IsOptional() @IsString() iyziReferenceCode?:string;
  @IsOptional() iyziEventTime?:number;
  @IsOptional() iyziPaymentId?:string|number;
}

export class CouponPreviewDto{
  @IsString() @IsNotEmpty() code!:string;
  @IsIn(['PLAN','THEME','APP','AI_CREDIT','EMAIL_CREDIT']) kind!:string;
  @IsString() @IsNotEmpty() targetId!:string;
  @IsOptional() @IsInt() @Min(1) @Max(100) quantity?:number;
}
