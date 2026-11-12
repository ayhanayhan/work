import {IsArray,IsBoolean,IsIn,IsInt,IsNumber,IsOptional,IsString,Max,MaxLength,Min} from 'class-validator';

export class CreditProductDto{
  @IsString() @MaxLength(120) name!:string;
  @IsString() @MaxLength(64) code!:string;
  @IsInt() @Min(1) @Max(1000000000) credits!:number;
  @IsNumber({maxDecimalPlaces:2}) @Min(0) price!:number;
  @IsOptional() @IsString() @MaxLength(3) currency?:string;
  @IsOptional() @IsBoolean() isActive?:boolean;
  @IsOptional() @IsInt() sortOrder?:number;
}

export class BillingCouponAdminDto{
  @IsString() @MaxLength(64) code!:string;
  @IsString() @MaxLength(120) name!:string;
  @IsIn(['PERCENTAGE','FIXED']) type!:'PERCENTAGE'|'FIXED';
  @IsNumber({maxDecimalPlaces:2}) @Min(0.01) value!:number;
  @IsOptional() @IsNumber({maxDecimalPlaces:2}) @Min(0) minAmount?:number|null;
  @IsOptional() @IsNumber({maxDecimalPlaces:2}) @Min(0) maxDiscount?:number|null;
  @IsOptional() @IsArray() @IsString({each:true}) appliesTo?:string[];
  @IsOptional() @IsInt() @Min(1) usageLimit?:number|null;
  @IsOptional() @IsInt() @Min(1) perTenantLimit?:number|null;
  @IsOptional() @IsString() @MaxLength(40) startsAt?:string|null;
  @IsOptional() @IsString() @MaxLength(40) endsAt?:string|null;
  @IsOptional() @IsBoolean() isActive?:boolean;
}
