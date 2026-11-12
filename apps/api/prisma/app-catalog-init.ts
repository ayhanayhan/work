import { PrismaClient } from '@prisma/client';

const prisma=new PrismaClient();

const credentialSchema=(fields:any[])=>({fields});
const defs:any[]=[
  {slug:'we-ai-assistant',name:'WE AI Asistan',category:'AI',summary:'AI asistan, çeviri, görsel üretimi, prompt yönetimi ve kredi.',description:'Yönetim panelinde konuşarak işlem yapın; ürün, kategori ve promosyon taslakları oluşturun. Çeviri ve görsel üretimi aynı uygulama içinde yönetilir.',icon:'iconoir:robot',kind:'AI',integrationType:'AI',provider:'we-ai',basePrice:0,billingType:'FREE',isFeatured:true,sortOrder:10,settingsSchema:{tabs:['assistant','translation','images','prompts','credits','integration'],platformManaged:true}},
];

async function main(){
  for(const row of defs){
    await prisma.appDefinition.upsert({
      where:{slug:row.slug},
      create:{...row,description:row.description||row.summary,currency:'TRY',isActive:true},
      update:{},
    });
  }
  console.log(`[app-catalog-init] ${defs.length} default app definition checked`);
}

main().finally(()=>prisma.$disconnect());
