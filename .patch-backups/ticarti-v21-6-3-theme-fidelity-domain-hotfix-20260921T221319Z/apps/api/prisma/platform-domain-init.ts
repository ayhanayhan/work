import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const system = [
  ['www','Ana platform alan adı',true],
  ['login','Mağaza yönetimi giriş alan adı',true],
  ['superadmin','Süper yönetici alan adı',true],
  ['dev','API alan adı',true],
  ['api','Sistem/API kullanımı',true],
  ['admin','Yönetim yolu için ayrılmış',true],
  ['app','Merkezi mağaza yönetim uygulaması',true],
  ['academy','Ticarti Academy alan adı',true],
  ['mail','E-posta altyapısı',false],
  ['cdn','Statik içerik altyapısı',false],
  ['static','Statik içerik altyapısı',false],
  ['assets','Statik içerik altyapısı',false],
  ['support','Destek alanı',false],
  ['help','Yardım alanı',false],
  ['status','Durum sayfası',false],
];

async function main(){
  for(const [value,reason,locked] of system){
    await prisma.reservedSubdomain.upsert({
      where:{value:String(value)},
      update:{reason:String(reason),isActive:true,locked:Boolean(locked)},
      create:{value:String(value),reason:String(reason),isActive:true,locked:Boolean(locked)},
    });
  }
  console.log(`Reserved subdomains initialized: ${system.length}`);
}

main().finally(()=>prisma.$disconnect());
