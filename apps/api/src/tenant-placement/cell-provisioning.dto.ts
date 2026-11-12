import {IsBoolean,IsOptional,IsString,MaxLength,MinLength} from 'class-validator';
export class ProvisionCellDto{
  @IsOptional() @IsBoolean() apply?:boolean;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(64) confirm?:string;
}
