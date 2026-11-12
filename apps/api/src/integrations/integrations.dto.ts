import {IsBoolean,IsIn,IsObject,IsOptional,IsString,MaxLength} from 'class-validator';

export const INTEGRATION_TYPES=['MARKETPLACE','PAYMENT','SHIPPING','INVOICE','MARKETING','AI','SOCIAL','ANALYTICS','MESSAGING','CRM'] as const;
export type IntegrationType=(typeof INTEGRATION_TYPES)[number];

export class CreateIntegrationDto{
  @IsIn(INTEGRATION_TYPES) type!:IntegrationType;
  @IsString() @MaxLength(80) provider!:string;
  @IsString() @MaxLength(160) name!:string;
  @IsObject() credentials!:Record<string,unknown>;
  @IsOptional() @IsObject() config?:Record<string,unknown>;
}

export class UpdateIntegrationDto{
  @IsOptional() @IsBoolean() enabled?:boolean;
  @IsOptional() @IsString() @MaxLength(160) name?:string;
  @IsOptional() @IsObject() credentials?:Record<string,unknown>;
  @IsOptional() @IsObject() config?:Record<string,unknown>;
}
