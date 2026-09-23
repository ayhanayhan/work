import { PrismaClient } from '@prisma/client';
import { ticartiSkinCatalog, ticartiSourceDesignForSkin, ticartiSourceHomePreset, TICARTI_DEFAULT_SKIN } from '../src/theme-presets/ticarti-source-preset';

const prisma=new PrismaClient();

async function main(){
  const themes=await prisma.themeDefinition.findMany({where:{slug:{in:['ticarti','nova-commerce','signature','wokiee']}}});
  if(!themes.length)throw new Error('Ticarti tema kaydı bulunamadı. Önce tema kataloğu oluşturulmalıdır.');
  const catalog=ticartiSkinCatalog();
  for(const theme of themes){
    const config:any=theme.config&&typeof theme.config==='object'&&!Array.isArray(theme.config)?theme.config:{};
    const existing:any=config.skinDefaults&&typeof config.skinDefaults==='object'&&!Array.isArray(config.skinDefaults)?config.skinDefaults:{};
    const next:any={...existing};
    let added=0;
    for(const skin of catalog){
      if(next[skin.slug])continue;
      next[skin.slug]={
        name:String(skin.name||skin.slug),
        category:String(skin.category||''),
        previewImageUrl:String(skin.previewImageUrl||theme.previewImageUrl||''),
        verifiedFromDemo:!!skin.verifiedFromDemo,
        design:ticartiSourceDesignForSkin(skin.slug),
        homePreset:ticartiSourceHomePreset(skin.slug),
      };
      added++;
    }
    await prisma.themeDefinition.update({where:{id:theme.id},data:{config:{...config,engine:'ticarti-db-theme-v1',sourceManagedBy:'DATABASE',sourceDbSeedVersion:'v23.2.0',defaultSkin:String(config.defaultSkin||TICARTI_DEFAULT_SKIN),skinDefaults:next}}});
    console.log(`${theme.slug}: ${Object.keys(next).length} skin DB kaynağı, ${added} yeni eklendi`);
  }
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());
