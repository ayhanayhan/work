import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class CapacityPlanDto {
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(1000000) standardTenants?: number;
  @IsOptional() @Type(()=>Number) @IsInt() @Min(0) @Max(10000) highVolumeTenants?: number;
  @IsOptional() @Type(()=>Number) @IsInt() @Min(250) @Max(10000) standardPerCell?: number;
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(100) highVolumePerCell?: number;
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(128) queueShards?: number;
  @IsOptional() @IsBoolean() dedicatedHighVolume?: boolean;
}
