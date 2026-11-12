import {BadRequestException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import type {Prisma} from '@prisma/client';
import {CacheService} from '../cache/cache.service';
import {crossRatesFromTry,parseTcmbTryRates} from '../common/tcmb-rates';
import {apiError} from '../i18n/api-error';
import {PrismaService} from '../prisma/prisma.service';

type LocaleInput=string|{locale?:string;label?:string;isEnabled?:boolean;sortOrder?:number};
type CurrencyInput=string|{code?:string;isEnabled?:boolean;exchangeRate?:number;rounding?:number};
export type RegionalSettingsInput={
  defaultLocale?:string;defaultCurrency?:string;locales?:LocaleInput[];currencies?:CurrencyInput[];
  currencyMeta?:Record<string,unknown>;exchange?:Record<string,unknown>;tax?:Record<string,unknown>;taxRules?:unknown[];
};
export type RefreshRatesInput={source?:string};

function jsonRecord(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{}}
function prismaJson(value:unknown):Prisma.InputJsonValue{return JSON.parse(JSON.stringify(value??{})) as Prisma.InputJsonValue}

@Injectable()
export class MerchantRegionalService{
  constructor(private readonly prisma:PrismaService,private readonly cache:CacheService){}
  private async store(tenantId:string,storeId:string){
    if(storeId!==tenantId)throw new ForbiddenException('Site does not belong to tenant');
    const store=await this.prisma.tenant.findUnique({where:{id:storeId}});
    if(!store)throw new NotFoundException('Store not found');
    return store;
  }
  async settings(tenantId:string,storeId:string){
    const store=await this.store(tenantId,storeId);const settings=jsonRecord(store.settings);
    const [locales,currencies]=await Promise.all([
      this.prisma.storeLocale.findMany({where:{storeId},orderBy:[{isDefault:'desc'},{sortOrder:'asc'}]}),
      this.prisma.storeCurrency.findMany({where:{storeId},orderBy:[{isDefault:'desc'},{code:'asc'}]}),
    ]);
    const regional=jsonRecord(settings.regional);
    return {defaultLocale:store.locale,defaultCurrency:store.currency,locales,currencies,currencyMeta:jsonRecord(regional.currencyMeta),exchange:Object.keys(jsonRecord(regional.exchange)).length?jsonRecord(regional.exchange):{source:'TCMB',autoUpdate:false,intervalHours:6,lastUpdatedAt:null},tax:Object.keys(jsonRecord(regional.tax)).length?jsonRecord(regional.tax):{pricesIncludeTax:true,defaultRate:20},taxRules:Array.isArray(regional.taxRules)?regional.taxRules:[]};
  }
  async update(tenantId:string,storeId:string,body:RegionalSettingsInput){
    const store=await this.store(tenantId,storeId);const settings=jsonRecord(store.settings);const regional=jsonRecord(settings.regional);
    const defaultLocale=String(body.defaultLocale||store.locale);const defaultCurrency=String(body.defaultCurrency||store.currency).toUpperCase();
    const locales=Array.isArray(body.locales)?body.locales:null;const currencies=Array.isArray(body.currencies)?body.currencies:null;
    await this.prisma.$transaction(async tx=>{
      if(locales){
        const normalized=locales.map((item,i)=>typeof item==='string'?{locale:item,label:item,isEnabled:true,isDefault:item===defaultLocale,sortOrder:i}:{locale:String(item.locale||''),label:String(item.label||item.locale||''),isEnabled:item.isEnabled!==false,isDefault:String(item.locale||'')===defaultLocale,sortOrder:Number(item.sortOrder??i)}).filter(x=>x.locale);
        if(normalized.length&&!normalized.some(x=>x.locale===defaultLocale))normalized.unshift({locale:defaultLocale,label:defaultLocale,isEnabled:true,isDefault:true,sortOrder:0});
        const codes=normalized.map(x=>x.locale);await tx.storeLocale.updateMany({where:{storeId,locale:{notIn:codes}},data:{isEnabled:false,isDefault:false}});
        for(const item of normalized)await tx.storeLocale.upsert({where:{storeId_locale:{storeId,locale:item.locale}},create:{storeId,...item},update:{label:item.label,isEnabled:item.isEnabled,isDefault:item.isDefault,sortOrder:item.sortOrder}});
      }
      if(currencies){
        const normalized=currencies.map(item=>typeof item==='string'?{code:item.toUpperCase(),isEnabled:true,isDefault:item.toUpperCase()===defaultCurrency,exchangeRate:1,rounding:2}:{code:String(item.code||'').toUpperCase(),isEnabled:item.isEnabled!==false,isDefault:String(item.code||'').toUpperCase()===defaultCurrency,exchangeRate:Number(item.exchangeRate||1),rounding:Number(item.rounding??2)}).filter(x=>x.code);
        if(normalized.length&&!normalized.some(x=>x.code===defaultCurrency))normalized.unshift({code:defaultCurrency,isEnabled:true,isDefault:true,exchangeRate:1,rounding:2});
        const codes=normalized.map(x=>x.code);await tx.storeCurrency.updateMany({where:{storeId,code:{notIn:codes}},data:{isEnabled:false,isDefault:false}});
        for(const item of normalized){const exchangeRate=item.isDefault?1:item.exchangeRate;await tx.storeCurrency.upsert({where:{storeId_code:{storeId,code:item.code}},create:{storeId,...item,exchangeRate},update:{isEnabled:item.isEnabled,isDefault:item.isDefault,exchangeRate,rounding:item.rounding}});}
      }
      const nextRegional:Record<string,unknown>={...regional};
      if(body.currencyMeta!==undefined)nextRegional.currencyMeta=body.currencyMeta||{};
      if(body.exchange!==undefined)nextRegional.exchange={...jsonRecord(regional.exchange),...(body.exchange||{})};
      if(body.tax!==undefined)nextRegional.tax={...jsonRecord(regional.tax),...(body.tax||{})};
      if(body.taxRules!==undefined)nextRegional.taxRules=Array.isArray(body.taxRules)?body.taxRules:[];
      const tenantData:Prisma.TenantUpdateInput={settings:prismaJson({...settings,regional:nextRegional}),...(body.defaultLocale!==undefined?{locale:defaultLocale}:{}),...(body.defaultCurrency!==undefined?{currency:defaultCurrency}:{})};
      await tx.tenant.update({where:{id:storeId},data:tenantData});
    });
    await Promise.all([this.cache.delPattern('public:site:*'),this.cache.purgeTenant(tenantId)]);
    return this.settings(tenantId,storeId);
  }
  async refresh(tenantId:string,storeId:string,body:RefreshRatesInput){
    const store=await this.store(tenantId,storeId);const settings=jsonRecord(store.settings);const regional=jsonRecord(settings.regional);const exchange=jsonRecord(regional.exchange);
    const source='TCMB';
    const rows=await this.prisma.storeCurrency.findMany({where:{storeId,isEnabled:true}});const base=String(store.currency||'TRY').toUpperCase();const targets=rows.map(x=>x.code).filter(x=>x!==base);const rates:Record<string,number>={[base]:1};
    try{
      if(targets.length){
        const res=await fetch('https://www.tcmb.gov.tr/kurlar/today.xml',{signal:AbortSignal.timeout(8_000),headers:{accept:'application/xml,text/xml;q=0.9,*/*;q=0.1','user-agent':'Ticarti-FX/1.0'}});const xml=await res.text();if(!res.ok)throw new Error(`TCMB HTTP ${res.status}`);Object.assign(rates,crossRatesFromTry(parseTcmbTryRates(xml),base,targets));
      }
      const meta=jsonRecord(regional.currencyMeta);
      await this.prisma.$transaction(async tx=>{
        for(const row of rows){const rowMeta=jsonRecord(meta[row.code]);if(rowMeta.pinned===true)continue;const rate=row.code===base?1:Number(rates[row.code]);if(!(rate>0))throw new Error(`${row.code} kuru doğrulanamadı`);await tx.storeCurrency.update({where:{id:row.id},data:{exchangeRate:rate}});}
        await tx.tenant.update({where:{id:storeId},data:{settings:prismaJson({...settings,regional:{...regional,exchange:{...exchange,source,lastUpdatedAt:new Date().toISOString(),lastAttemptAt:new Date().toISOString(),lastError:null}}})}});
      });
    }catch(error:unknown){
      const message=error instanceof Error?error.message:'service error';
      await this.prisma.tenant.update({where:{id:storeId},data:{settings:prismaJson({...settings,regional:{...regional,exchange:{...exchange,source,lastAttemptAt:new Date().toISOString(),lastError:message.slice(0,300)}}})}}).catch(()=>undefined);
      throw new BadRequestException(apiError('merchant.fx.updateFailed',{error:message}));
    }
    await this.cache.delPattern('public:site:*');
    return this.settings(tenantId,storeId);
  }
}
