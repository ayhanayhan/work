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
    return rows.filter(row=>{
      const features:any=row?.features&&typeof row.features==='object'&&!Array.isArray(row.features)?row.features:{};
      return features?._meta?.frontendVisible!==false;
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

  apps(){
    return this.prisma.appDefinition.findMany({
      where:{isActive:true},
      orderBy:[{isFeatured:'desc'},{sortOrder:'asc'},{name:'asc'}],
      select:{
        id:true,slug:true,name:true,category:true,summary:true,description:true,icon:true,developer:true,
        kind:true,provider:true,integrationType:true,basePrice:true,currency:true,billingType:true,isFeatured:true,sortOrder:true,
      },
    });
  }

}
