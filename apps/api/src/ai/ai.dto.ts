import {Type} from 'class-transformer';
import {IsArray,IsBoolean,IsIn,IsObject,IsOptional,IsString,MaxLength,ValidateNested} from 'class-validator';
import {BillingBuyerDto} from '../billing/billing.dto';

export class AiSettingsDto{
  @IsOptional() @IsBoolean() assistantEnabled?:boolean;
  @IsOptional() @IsBoolean() translationEnabled?:boolean;
  @IsOptional() @IsBoolean() imageEnabled?:boolean;
  @IsOptional() @IsString() @MaxLength(80) assistantName?:string;
}

export class AiPromptDto{
  @IsOptional() @IsString() @MaxLength(120) id?:string;
  @IsOptional() @IsString() @MaxLength(80) category?:string;
  @IsOptional() @IsString() @MaxLength(120) name?:string;
  @IsOptional() @IsString() @MaxLength(8000) prompt?:string;
}
export class AiPromptsDto{
  @IsArray() @ValidateNested({each:true}) @Type(()=>AiPromptDto) items!:AiPromptDto[];
}
export class AiChatDto{
  @IsOptional() @IsString() @MaxLength(80) storeId?:string;
  @IsString() @MaxLength(12000) message!:string;
}
export class AiExecuteDto{
  @IsOptional() @IsString() @MaxLength(80) storeId?:string;
  @IsObject() action!:Record<string,unknown>;
}
export class AiTranslateDto{
  @IsOptional() @IsString() @MaxLength(80) storeId?:string;
  @IsObject() fields!:Record<string,unknown>;
  @IsOptional() @IsBoolean() emptyOnly?:boolean;
  @IsOptional() @IsString() @MaxLength(40) sourceLocale?:string;
  @IsString() @MaxLength(40) targetLocale!:string;
}
export class AiImageDto{
  @IsOptional() @IsString() @MaxLength(80) storeId?:string;
  @IsOptional() @IsString() @MaxLength(16000) prompt?:string;
  @IsOptional() @IsString() @MaxLength(32) @IsIn(['STUDIO','LIFESTYLE','DETAIL','HERO','CATEGORY','BLOG','SOCIAL']) useCase?:string;
  @IsOptional() @IsString() @MaxLength(32) size?:string;
  @IsOptional() @IsString() @MaxLength(2048) sourceImageUrl?:string;
  @IsOptional() @IsString() @MaxLength(240) alt?:string;
}
export class AiCreditPurchaseDto{
  @IsString() @MaxLength(80) packageCode!:string;
  @IsOptional() @IsString() @MaxLength(64) couponCode?:string;
  @IsOptional() @ValidateNested() @Type(()=>BillingBuyerDto) buyer?:BillingBuyerDto;
}
