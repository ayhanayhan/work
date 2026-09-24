import { PrismaClient } from '@prisma/client';

const prisma=new PrismaClient();

const defs:any[]=[
  {slug:'fixed-currency-prices',name:'Sabit Döviz Fiyatları',category:'Fiyatlandırma',summary:'Aktif para birimleri için ürün bazında sabit fiyat tanımlayın.',description:'Kur dönüşümü yerine ürün varyantı bazında mağazada aktif para birimleri için sabit fiyat kullanın.',icon:'iconoir:coin',kind:'TOOL',integrationType:null,provider:null,basePrice:0,billingType:'FREE',isFeatured:false,sortOrder:15,settingsSchema:{mode:'toggle-only',marketplace:{usageGuide:'Uygulamayı kurun ve açık bırakın. Ürün düzenleme ekranında aktif para birimleri için sabit fiyat alanları görünür.'}}},
  {slug:'we-ai-assistant',name:'WE AI Asistan',category:'AI',summary:'AI asistan, çeviri, görsel üretimi, prompt yönetimi ve kredi.',description:'Yönetim panelinde konuşarak işlem yapın; ürün, kategori ve promosyon taslakları oluşturun. Çeviri ve görsel üretimi aynı uygulama içinde yönetilir.',icon:'iconoir:robot',kind:'AI',integrationType:'AI',provider:'we-ai',basePrice:0,billingType:'FREE',isFeatured:true,sortOrder:10,settingsSchema:{tabs:['assistant','translation','images','prompts','credits','integration']}},
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
