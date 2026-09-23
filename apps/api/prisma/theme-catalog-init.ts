import {PrismaClient} from '@prisma/client';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const prisma=new PrismaClient();
const SIGNATURE_SLUG='ticarti-signature-complete';
const LEGACY_THEME_SLUGS=[
  'nova-commerce','atelier','noya','orbit-market','casa-linea','aurelia',
  'velo','pantry','tiny-co','forge','mono-studio','vertex-b2b'
];

async function main(){
  const packagePath=join(process.cwd(),'prisma','ticarti-signature-complete-theme-package.json');
  const themePackage:any=JSON.parse(readFileSync(packagePath,'utf8'));
  const rows:any[]=Array.isArray(themePackage.themes)?themePackage.themes:[];
  if(!rows.length)throw new Error('Ticarti tema paketi bulunamadi');

  let signature:any=null;
  for(let index=0;index<rows.length;index++){
    const row:any=rows[index]||{};
    const slug=String(row.slug||'').trim();
    if(!slug||!row.name)continue;
    const rawConfig:any=row.config&&typeof row.config==='object'&&!Array.isArray(row.config)?row.config:{};
    const config={
      ...rawConfig,
      visibility:'PUBLIC',
      catalogGroup:String(rawConfig.catalogGroup||'Ticarti Temaları'),
      catalogGroupOrder:Number(rawConfig.catalogGroupOrder??0),
      package:{
        ...(rawConfig.package||{}),
        format:'TICARTI_THEME_PACKAGE',
        packageVersion:String(themePackage.packageVersion||'21.6.3'),
        importedAt:new Date().toISOString()
      }
    };
    const data:any={
      name:String(row.name),
      description:row.description?String(row.description):null,
      category:String(row.category||'GENEL'),
      previewImageUrl:row.previewImageUrl?String(row.previewImageUrl):null,
      version:String(row.version||themePackage.packageVersion||'21.6.3'),
      basePrice:Number(row.basePrice||0),
      currency:String(row.currency||'TRY'),
      billingType:'FREE',
      isActive:row.isActive!==false,
      isFeatured:!!row.isFeatured,
      isDefault:slug===SIGNATURE_SLUG?true:!!row.isDefault,
      sortOrder:slug===SIGNATURE_SLUG?0:Number(row.sortOrder??100+index),
      config
    };
    if(data.isDefault)await prisma.themeDefinition.updateMany({where:{slug:{not:slug}},data:{isDefault:false}});
    const saved=await prisma.themeDefinition.upsert({where:{slug},create:{slug,...data},update:data});
    if(slug===SIGNATURE_SLUG)signature=saved;
  }

  if(!signature)signature=await prisma.themeDefinition.findUnique({where:{slug:SIGNATURE_SLUG}});
  if(!signature)throw new Error('Ticarti ana tema kaydi olusturulamadi');

  // Existing empty/demo tenants are pointed to the one supported theme before cleanup.
  await prisma.tenant.updateMany({
    where:{activeTheme:{in:['default','',...LEGACY_THEME_SLUGS]}},
    data:{activeTheme:SIGNATURE_SLUG}
  });

  // Remove the old demo theme catalog completely. Future theme families are not touched.
  const legacy=await prisma.themeDefinition.findMany({where:{slug:{in:LEGACY_THEME_SLUGS}},select:{id:true}});
  const legacyIds=legacy.map((x:any)=>x.id);
  if(legacyIds.length){
    await prisma.themePayment.deleteMany({where:{themeId:{in:legacyIds}}});
    await prisma.themeDefinition.deleteMany({where:{id:{in:legacyIds}}});
  }

  await prisma.themeDefinition.update({
    where:{id:signature.id},
    data:{isDefault:true,isActive:true,basePrice:0,billingType:'FREE',sortOrder:0}
  });
  await prisma.themePlanPrice.updateMany({where:{themeId:signature.id},data:{price:0,included:true,isActive:true}});

  const skinCount=Array.isArray((themePackage.themes?.find((x:any)=>x.slug===SIGNATURE_SLUG)?.config||{}).skins)
    ? themePackage.themes.find((x:any)=>x.slug===SIGNATURE_SLUG).config.skins.length
    : 0;
  console.log(`[theme-catalog] Ticarti Temalari: 1 tema ailesi, ${skinCount} skin; eski demo temalari silindi`);
}

main().finally(()=>prisma.$disconnect());
