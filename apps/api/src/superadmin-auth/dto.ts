import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SuperAdminLoginDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(1) @MaxLength(128) password!: string;
}

export class SuperAdminRefreshDto {
  @IsOptional() @IsString() @MaxLength(256) refreshToken?: string;
}
