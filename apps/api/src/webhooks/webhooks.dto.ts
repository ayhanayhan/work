import {ArrayMaxSize,ArrayMinSize,IsArray,IsString,IsUrl,MaxLength} from 'class-validator';
export class CreateWebhookDto{
  @IsUrl({protocols:['https'],require_protocol:true},{message:'Webhook URL HTTPS olmalı'}) @MaxLength(2048) url!:string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @IsString({each:true}) events!:string[];
}
