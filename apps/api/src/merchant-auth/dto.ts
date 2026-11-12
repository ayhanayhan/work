import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

export class MerchantRegisterDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @Matches(strongPassword, { message: 'Password must be 8-128 chars and include upper, lower, number and symbol' }) password!: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsString() @MinLength(2) @MaxLength(160) companyName!: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(63) subdomain?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(80) sector?: string;
  @IsOptional() @IsBoolean() pricesIncludeTax?: boolean;
}

export class MerchantLoginDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(1) @MaxLength(128) password!: string;
}

export class MerchantGoogleDto {
  @IsString() @MinLength(20) @MaxLength(8192) credential!: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) companyName?: string;
}

export class MerchantForgotPasswordDto {
  @IsEmail() @MaxLength(254) email!: string;
}

export class MerchantResetPasswordDto {
  @IsString() @MinLength(32) @MaxLength(512) token!: string;
  @IsString() @Matches(strongPassword, { message: 'Password must be 8-128 chars and include upper, lower, number and symbol' }) password!: string;
}

export class MerchantHandoffDto {
  @IsString() @MinLength(32) @MaxLength(512) code!: string;
}

export class MerchantRefreshDto {
  @IsOptional() @IsString() @MaxLength(256) refreshToken?: string;
}
