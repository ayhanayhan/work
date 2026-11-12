import { PrismaClient } from '@prisma/client';
const prisma=new PrismaClient();

async function main(){
  const rows:any[]=await prisma.themeDefinition.findMany({select:{id:true,slug:true,name:true,config:true}});
  const keep=rows.filter((x:any)=>{
    const cfg:any=x.config||{};
    return cfg?.format==='ticarti-theme-package'||['ticarti-lingerie','ticarti-jewelry'].includes(String(x.slug||''));
  });
  const remove=rows.filter((x:any)=>!keep.some((k:any)=>k.id===x.id));
  console.log('[theme-library] korunacak:',keep.map((x:any)=>`${x.slug} (${x.name})`).join(', ')||'-');
  console.log('[theme-library] silinecek:',remove.map((x:any)=>`${x.slug} (${x.name})`).join(', ')||'-');
  if(!remove.length)return;
  const ids=remove.map((x:any)=>x.id);
  await prisma.$transaction(async tx=>{
    await tx.themePayment.deleteMany({where:{themeId:{in:ids}}});
    await tx.themePlanPrice.deleteMany({where:{themeId:{in:ids}}});
    await tx.themeInstallation.deleteMany({where:{themeId:{in:ids}}});
    await tx.themeDefinition.deleteMany({where:{id:{in:ids}}});
  });
  console.log(`[theme-library] ${ids.length} legacy tema silindi`);
}
main().finally(()=>prisma.$disconnect());
