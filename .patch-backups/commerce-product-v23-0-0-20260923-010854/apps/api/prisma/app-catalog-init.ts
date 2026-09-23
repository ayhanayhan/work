import { PrismaClient } from '@prisma/client';

const prisma=new PrismaClient();

const credentialSchema=(fields:any[])=>({fields});
const defs:any[]=[
  {slug:'we-ai-assistant',name:'WE AI Asistan',category:'AI',summary:'AI asistan, çeviri, görsel üretimi, prompt yönetimi ve kredi.',description:'Yönetim panelinde konuşarak işlem yapın; ürün, kategori ve promosyon taslakları oluşturun. Çeviri ve görsel üretimi aynı uygulama içinde yönetilir.',icon:'iconoir:robot',kind:'AI',integrationType:'AI',provider:'we-ai',basePrice:0,billingType:'FREE',isFeatured:true,sortOrder:10,settingsSchema:{tabs:['assistant','translation','images','prompts','credits','integration']}},
  {slug:'whatsapp-ai',name:'WhatsApp AI Sipariş',category:'Pazarlama',summary:'WhatsApp üzerinden AI destekli satış, sipariş ve destek.',icon:'iconoir:chat-bubble',kind:'INTEGRATION',integrationType:'MESSAGING',provider:'whatsapp',basePrice:0,billingType:'MONTHLY',sortOrder:20,settingsSchema:credentialSchema([{key:'apiKey',label:'Access Token',type:'password'},{key:'accountId',label:'Phone Number ID',type:'text'},{key:'apiSecret',label:'Webhook Secret',type:'password'}])},
  {slug:'google-shopping',name:'Google Shopping',category:'Pazarlama',summary:'Merchant Center ürün feed ve senkronizasyon.',icon:'iconoir:shopping-bag',kind:'INTEGRATION',integrationType:'MARKETING',provider:'google-shopping',sortOrder:30,settingsSchema:credentialSchema([{key:'accountId',label:'Merchant ID',type:'text'},{key:'apiKey',label:'API Key / OAuth Token',type:'password'}])},
  {slug:'meta-pixel',name:'Meta / Facebook Pixel',category:'Pazarlama',summary:'Meta Pixel ve dönüşüm olayları.',icon:'iconoir:facebook',kind:'INTEGRATION',integrationType:'ANALYTICS',provider:'meta-pixel',sortOrder:40,settingsSchema:credentialSchema([{key:'accountId',label:'Pixel ID',type:'text'},{key:'apiKey',label:'Conversions API Token',type:'password'}])},
  {slug:'google-analytics-4',name:'Google Analytics 4',category:'Pazarlama',summary:'GA4 e-ticaret olayları ve ölçümleme.',icon:'iconoir:stats-up-square',kind:'INTEGRATION',integrationType:'ANALYTICS',provider:'google-analytics',sortOrder:50,settingsSchema:credentialSchema([{key:'accountId',label:'Measurement ID',type:'text'},{key:'apiKey',label:'API Secret',type:'password'}])},
  {slug:'google-tag-manager',name:'Google Tag Manager',category:'Pazarlama',summary:'Etiket ve ölçüm yönetimi.',icon:'iconoir:code-brackets-square',kind:'INTEGRATION',integrationType:'ANALYTICS',provider:'google-tag-manager',sortOrder:60,settingsSchema:credentialSchema([{key:'accountId',label:'Container ID',type:'text'}])},
  {slug:'sms',name:'SMS',category:'Pazarlama',summary:'SMS sağlayıcısı bağlantısı.',icon:'iconoir:message-text',kind:'INTEGRATION',integrationType:'MESSAGING',provider:'sms',sortOrder:70,settingsSchema:credentialSchema([{key:'apiKey',label:'API Key',type:'password'},{key:'apiSecret',label:'API Secret',type:'password'},{key:'accountId',label:'Gönderici / Hesap',type:'text'}])},
  ...[
    ['trendyol','Trendyol'],['hepsiburada','Hepsiburada'],['n11','n11'],['amazon','Amazon'],['pazarama','Pazarama'],['ciceksepeti','Çiçeksepeti'],['pttavm','PTTAVM']
  ].map(([slug,name],i)=>({slug,name,category:'Pazaryeri',summary:'Ürün, stok, fiyat ve sipariş senkronizasyonu.',icon:'iconoir:shop',kind:'INTEGRATION',integrationType:'MARKETPLACE',provider:slug,sortOrder:100+i,settingsSchema:credentialSchema([{key:'apiKey',label:'API Key / Kullanıcı',type:'text'},{key:'apiSecret',label:'API Secret / Şifre',type:'password'},{key:'accountId',label:'Satıcı / Merchant ID',type:'text'}])})),
  ...[
    ['yurtici','Yurtiçi Kargo'],['aras','Aras Kargo'],['mng','MNG Kargo'],['surat','Sürat Kargo'],['ptt','PTT Kargo']
  ].map(([slug,name],i)=>({slug:`kargo-${slug}`,name,category:'Kargo',summary:'Gönderi oluşturma, barkod ve kargo takip entegrasyonu.',icon:'iconoir:delivery-truck',kind:'INTEGRATION',integrationType:'SHIPPING',provider:slug,sortOrder:200+i,settingsSchema:credentialSchema([{key:'apiKey',label:'Müşteri Kodu / Kullanıcı',type:'text'},{key:'apiSecret',label:'Şifre / API Secret',type:'password'},{key:'accountId',label:'Hesap Kodu',type:'text'}])})),
  ...[
    ['parasut','Paraşüt'],['logo','Logo'],['mikro','Mikro'],['nebim','Nebim']
  ].map(([slug,name],i)=>({slug:`fatura-${slug}`,name,category:'Fatura & Muhasebe',summary:'e-Fatura, e-Arşiv ve muhasebe senkronizasyonu.',icon:'iconoir:reports',kind:'INTEGRATION',integrationType:'INVOICE',provider:slug,sortOrder:300+i,settingsSchema:credentialSchema([{key:'apiKey',label:'API Key / Kullanıcı',type:'text'},{key:'apiSecret',label:'API Secret / Şifre',type:'password'},{key:'accountId',label:'Firma / Hesap ID',type:'text'}])})),
  ...[
    ['iyzico','iyzico'],['paytr','PayTR'],['param','Param'],['sipay','Sipay'],['stripe','Stripe']
  ].map(([slug,name],i)=>({slug:`odeme-${slug}`,name,category:'Ödeme',summary:'Online ödeme sağlayıcısı bağlantısı.',icon:'iconoir:credit-card',kind:'INTEGRATION',integrationType:'PAYMENT',provider:slug,sortOrder:400+i,settingsSchema:credentialSchema([{key:'apiKey',label:'API Key / Merchant',type:'text'},{key:'apiSecret',label:'Secret Key',type:'password'},{key:'accountId',label:'Hesap ID',type:'text'}])})),
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
