import {IsBoolean,IsOptional,IsString,MaxLength,MinLength} from 'class-validator';
export class PlanTenantCellMigrationDto{@IsString() @MinLength(2) @MaxLength(32) targetCellCode!:string}
export class FailTenantCellMigrationDto{@IsString() @MinLength(1) @MaxLength(1000) message!:string}
export class AutoRunTenantCellMigrationDto{@IsOptional() @IsBoolean() cutover?:boolean}
