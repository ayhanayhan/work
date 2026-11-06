import {PrismaService} from '../prisma/prisma.service';

export type PlatformLocale={locale:string;label:string;isDefault:boolean};
const defaults:PlatformLocale[]=[
  {locale:'tr',label:'Türkçe',isDefault:true},
  {locale:'en',label:'English',isDefault:false}
];

/** Canonical active platform locales. Never fall back to hard-coded editor languages. */
export async function activePlatformLocales(prisma:PrismaService):Promise<PlatformLocale[]>{
  const row=await prisma.platformSetting.findUnique({where:{key:'general'}});
  const value=row?.value as any;
  const source=Array.isArray(value?.locales)&&value.locales.length?value.locales:defaults;
  const seen=new Set<string>();
  return source.filter((x:any)=>x?.isActive!==false)
    .sort((a:any,b:any)=>Number(a.sortOrder||0)-Number(b.sortOrder||0))
    .map((x:any)=>({
      locale:String(x.locale||'').trim().toLowerCase(),
      label:String(x.label||x.locale||'').trim(),
      isDefault:!!x.isDefault
    }))
    .filter((x:PlatformLocale)=>{
      if(!/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(x.locale)||seen.has(x.locale))return false;
      seen.add(x.locale);
      return true;
    });
}
