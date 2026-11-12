import {PrismaClient} from '@prisma/client';

const prisma=new PrismaClient();
try{
  const [groups,groupItems,productLegacyGoogle,categoryGoogle,b2bQuestions,b2bQuotes]=await Promise.all([
    prisma.productGroup.count(),
    prisma.productGroupItem.count(),
    prisma.product.count({where:{googleProductCategory:{not:null}}}),
    prisma.category.count({where:{googleProductCategory:{not:null}}}),
    prisma.question.count({where:{type:'B2B_QUOTE'}}),
    prisma.b2BQuoteRequest.count().catch(()=>-1),
  ]);

  console.log('=== TICARTI CORE COMMERCE DOMAIN PREFLIGHT ===');
  console.log(`ProductGroup rows: ${groups}`);
  console.log(`ProductGroupItem rows: ${groupItems}`);
  console.log(`Product.googleProductCategory non-null: ${productLegacyGoogle}`);
  console.log(`Category.googleProductCategory non-null: ${categoryGoogle}`);
  console.log(`Legacy Question B2B_QUOTE rows: ${b2bQuestions}`);
  console.log(`B2BQuoteRequest rows: ${b2bQuotes<0?'table not migrated yet':b2bQuotes}`);
  console.log('');
  if(groups===0&&groupItems===0)console.log('PRODUCT GROUP: SAFE TO DROP after code cleanup.');
  else console.log('PRODUCT GROUP: DATA EXISTS; do NOT drop. Export/migrate first.');
  if(productLegacyGoogle===0)console.log('PRODUCT GOOGLE CATEGORY: SAFE TO DROP legacy Product column after code cleanup.');
  else console.log('PRODUCT GOOGLE CATEGORY: DATA EXISTS; backfill to Category before drop.');
}finally{
  await prisma.$disconnect();
}
