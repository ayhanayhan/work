import {IsEnum,IsInt,IsOptional,IsString,IsUrl,Max,MaxLength,Min} from 'class-validator';

export enum InfrastructureCellStatusDto{ACTIVE='ACTIVE',DRAINING='DRAINING',READ_ONLY='READ_ONLY',DISABLED='DISABLED'}
export enum TenantWorkloadClassDto{STANDARD='STANDARD',BUSY='BUSY',HIGH_VOLUME='HIGH_VOLUME',DEDICATED='DEDICATED'}
export enum TenantIsolationLevelDto{SHARED='SHARED',ISOLATED_WORKERS='ISOLATED_WORKERS',DEDICATED_CELL='DEDICATED_CELL'}
export enum CellDatabaseModeDto{SHARED='SHARED',DEDICATED='DEDICATED'}

export class InfrastructureCellDto{
  @IsOptional() @IsString() @MaxLength(32) code?:string;
  @IsOptional() @IsString() @MaxLength(64) region?:string;
  @IsOptional() @IsEnum(InfrastructureCellStatusDto) status?:InfrastructureCellStatusDto;
  @IsOptional() @IsString() @MaxLength(80) databasePoolKey?:string;
  @IsOptional() @IsEnum(CellDatabaseModeDto) databaseMode?:CellDatabaseModeDto;
  @IsOptional() @IsUrl({require_protocol:true,protocols:['https','http']}) @MaxLength(240) apiBaseUrl?:string;
  @IsOptional() @IsString() @MaxLength(80) redisPoolKey?:string;
  @IsOptional() @IsString() @MaxLength(40) redisNamespace?:string;
  @IsOptional() @IsInt() @Min(1) @Max(128) queueShardCount?:number;
  @IsOptional() @IsInt() @Min(1) @Max(100000) maxTenants?:number;
}

export class TenantPlacementDto{
  @IsOptional() @IsString() @MaxLength(32) cellCode?:string;
  @IsOptional() @IsEnum(TenantWorkloadClassDto) workloadClass?:TenantWorkloadClassDto;
  @IsOptional() @IsEnum(TenantIsolationLevelDto) isolationLevel?:TenantIsolationLevelDto;
  @IsOptional() @IsInt() @Min(0) @Max(127) queueShard?:number;
  @IsOptional() @IsInt() @Min(1) @Max(64) maxConcurrentJobs?:number;
  @IsOptional() @IsInt() @Min(1) @Max(2000) webhookRatePerSecond?:number;
  @IsOptional() @IsInt() @Min(1) @Max(1000) priority?:number;
}
