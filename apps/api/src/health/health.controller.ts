import {Controller,Get,ServiceUnavailableException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import {CacheService} from '../cache/cache.service';
@Controller('health')
export class HealthController{
  constructor(private readonly prisma:PrismaService,private readonly cache:CacheService){}
  @Get() health(){return{ok:true,service:'commerce-api',time:new Date().toISOString(),version:process.env.K_REVISION||process.env.APP_VERSION||'local'}}
  @Get('live') live(){return{ok:true,time:new Date().toISOString()}}
  @Get('ready') async ready(){
    const started=Date.now();let database=false;let cache:any={configured:false,connected:false};
    try{await this.prisma.$queryRaw`SELECT 1`;database=true}catch{}
    try{cache=await this.cache.stats()}catch{}
    const body={ok:database,database,cache:{configured:!!cache?.configured,connected:!!cache?.connected},latencyMs:Date.now()-started,time:new Date().toISOString()};
    if(!database)throw new ServiceUnavailableException(body);return body;
  }
}
