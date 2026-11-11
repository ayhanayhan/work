import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  async plans(){
    const rows:any[]=await this.prisma.plan.findMany({
      where:{isActive:true},
      orderBy:[{sortOrder:'asc'},{monthlyPrice:'asc'}],
      select:{
        id:true,name:true,code:true,description:true,monthlyPrice:true,yearlyPrice:true,currency:true,
        trialDays:true,maxStaff:true,maxProducts:true,maxOrdersPerMonth:true,features:true,sortOrder:true,
      },
    });
    const now=Date.now();
    return rows.filter(row=>{
      const features:any=row?.features&&typeof row.features==='object'&&!Array.isArray(row.features)?row.features:{};
      return features?._meta?.frontendVisible!==false;
    }).map(row=>{
      const features:any=row?.features&&typeof row.features==='object'&&!Array.isArray(row.features)?row.features:{};
      const fallback=[
        {period:'MONTHLY',label:'Aylık',enabled:Number(row.monthlyPrice||0)>0,price:Number(row.monthlyPrice||0),salePrice:null,saleStartAt:'',saleEndAt:''},
        {period:'YEARLY',label:'Yıllık',enabled:row.yearlyPrice!==null&&row.yearlyPrice!==undefined&&Number(row.yearlyPrice||0)>0,price:Number(row.yearlyPrice||0),salePrice:null,saleStartAt:'',saleEndAt:''},
      ];
      const source=Array.isArray(features?._pricing)?features._pricing:fallback;
      const pricing=source.filter((x:any)=>x.enabled===true).map((x:any)=>{
        const start=x.saleStartAt?new Date(x.saleStartAt).getTime():null;
        const end=x.saleEndAt?new Date(x.saleEndAt).getTime():null;
        const sale=Number(x.salePrice);
        const hasSale=x.salePrice!==null&&x.salePrice!==undefined&&x.salePrice!==''&&Number.isFinite(sale)&&sale>=0;
        const inWindow=(!start||now>=start)&&(!end||now<=end);
        const isDiscountActive=hasSale&&inWindow;
        return {period:x.period,label:x.label||x.period,normalPrice:Number(x.price||0),salePrice:hasSale?sale:null,saleStartAt:x.saleStartAt||'',saleEndAt:x.saleEndAt||'',isDiscountActive,effectivePrice:isDiscountActive?sale:Number(x.price||0)};
      });
      return {...row,pricing};
    });
  }

  private async packageFeatureCatalog(){
    const [catalogRow,settingsRow]:any=await Promise.all([
      (this.prisma as any).platformSetting.findUnique({where:{key:'plan_feature_catalog'}}),
      (this.prisma as any).platformSetting.findUnique({where:{key:'platform_settings'}}),
    ]);
    const catalog:any=catalogRow?.value&&typeof catalogRow.value==='object'?catalogRow.value:{categories:[],features:[]};
    const settings:any=settingsRow?.value&&typeof settingsRow.value==='object'?settingsRow.value:{};
    const locales=Array.isArray(settings.locales)?settings.locales:[];
    const defaultLocale=String(locales.find((x:any)=>x.isDefault)?.locale||locales.find((x:any)=>x.isActive!==false)?.locale||'tr');
    return {catalog,defaultLocale};
  }

  async packageFeatures(locale?:string){
    const {catalog,defaultLocale}=await this.packageFeatureCatalog();const lang=String(locale||defaultLocale);
    const categories=(Array.isArray(catalog.categories)?catalog.categories:[]).filter((x:any)=>x.isActive!==false).sort((a:any,b:any)=>Number(a.sortOrder||0)-Number(b.sortOrder||0)).map((x:any)=>({id:x.id,code:x.code,title:x.translations?.[lang]?.title||x.translations?.[defaultLocale]?.title||x.code,description:x.translations?.[lang]?.description||x.translations?.[defaultLocale]?.description||''}));
    const features=(Array.isArray(catalog.features)?catalog.features:[]).filter((x:any)=>x.isActive!==false&&x.isPageEnabled!==false).sort((a:any,b:any)=>Number(a.sortOrder||0)-Number(b.sortOrder||0)).map((x:any)=>{const t=x.translations?.[lang]||x.translations?.[defaultLocale]||{};return{id:x.id,code:x.code,categoryId:x.categoryId,valueType:x.valueType,imageUrl:x.imageUrl||'',title:t.title||x.code,subtitle:t.subtitle||'',slug:t.slug||x.id,description:t.description||'',seoTitle:t.seoTitle||'',seoDescription:t.seoDescription||''}});
    return {locale:lang,categories,features};
  }

  async packageFeature(slug:string,locale?:string){
    const {catalog,defaultLocale}=await this.packageFeatureCatalog();const lang=String(locale||defaultLocale);const rows=Array.isArray(catalog.features)?catalog.features:[];const row=rows.find((x:any)=>x.isActive!==false&&x.isPageEnabled!==false&&String(x.translations?.[lang]?.slug||x.translations?.[defaultLocale]?.slug||x.id)===String(slug));if(!row)return null;const t=row.translations?.[lang]||row.translations?.[defaultLocale]||{};const category=(Array.isArray(catalog.categories)?catalog.categories:[]).find((x:any)=>x.id===row.categoryId);const ct=category?.translations?.[lang]||category?.translations?.[defaultLocale]||{};return{locale:lang,id:row.id,code:row.code,category:{id:category?.id||'',title:ct.title||category?.code||''},valueType:row.valueType,imageUrl:row.imageUrl||'',title:t.title||row.code,subtitle:t.subtitle||'',slug:t.slug||row.id,description:t.description||'',body:t.body||'',seoTitle:t.seoTitle||'',seoDescription:t.seoDescription||''};
  }

  async apps(){
    const rows=await this.prisma.appDefinition.findMany({
      where:{isActive:true},
      include:{_count:{select:{installs:true}}},
      orderBy:[{isFeatured:'desc'},{sortOrder:'asc'},{name:'asc'}],
    });
    const categorySetting=await this.prisma.platformSetting.findUnique({where:{key:'app_categories'}});
    const categories=Array.isArray((categorySetting?.value as any)?.categories)?(categorySetting?.value as any).categories:[];
    return rows.map(app=>{
      const schema:any=app.settingsSchema&&typeof app.settingsSchema==='object'?app.settingsSchema:{};
      const market:any=schema.marketplace&&typeof schema.marketplace==='object'?schema.marketplace:{};
      const translations=market.translations?.['tr-TR']||market.translations?.tr||{};
      const cat=categories.find((item:any)=>String(item.id)===String(market.categoryId));
      const catName=cat?.translations?.['tr-TR']?.name||cat?.translations?.tr?.name||cat?.name||app.category;
      return {
        id:app.id,slug:app.slug,name:String(translations.name||app.name),category:String(catName),
        categoryId:String(market.categoryId||app.category),summary:String(translations.summary||app.summary),
        description:String(translations.description||app.description||''),
        icon:app.icon,logoUrl:String(market.logoUrl||''),developer:app.developer,kind:app.kind,
        provider:app.provider,integrationType:app.integrationType,
        basePrice:Number(app.basePrice),currency:app.currency,billingType:app.billingType,
        isFeatured:app.isFeatured,sortOrder:app.sortOrder,downloadCount:app._count.installs,
        createdAt:app.createdAt,updatedAt:app.updatedAt,
        screenshots:Array.isArray(market.screenshots)?market.screenshots.filter((x:any)=>typeof x==='string'&&/^https:\/\//.test(x)):[],
        languages:Array.isArray(market.languages)?market.languages.filter((x:any)=>typeof x==='string'):[],
        usageGuide:String(market.usageGuide||''),version:String(market.version||''),
        websiteUrl:String(market.websiteUrl||''),
      };
    });
  }

}
