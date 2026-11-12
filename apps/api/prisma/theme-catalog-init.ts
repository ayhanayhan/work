import { PrismaClient } from '@prisma/client';
const prisma=new PrismaClient();
async function main(){
  const count=await prisma.themeDefinition.count();
  console.log(`[theme-catalog] legacy native theme seeding disabled; existing definitions: ${count}`);
}
main().finally(()=>prisma.$disconnect());
