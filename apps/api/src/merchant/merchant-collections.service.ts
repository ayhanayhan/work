import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MerchantCollectionsService {
  constructor(private readonly prisma:PrismaService){}

  private slugify(value:any){
    return String(value||'')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/ı/g,'i')
      .replace(/ğ/g,'g')
      .replace(/ü/g,'u')
      .replace(/ş/g,'s')
      .replace(/ö/g,'o')
      .replace(/ç/g,'c')
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'');
  }

  private async assertStore(tenantId:string,storeId:string){
    if(!storeId || storeId!==tenantId) throw new ForbiddenException('Site does not belong to tenant');
    const tenant=await this.prisma.tenant.findUnique({where:{id:tenantId},select:{id:true}});
    if(!tenant) throw new ForbiddenException('Tenant not found');
  }

  async list(tenantId:string,storeId:string){
    await this.assertStore(tenantId,storeId);
    return this.prisma.collection.findMany({
      where:{storeId},
      include:{products:{include:{product:true}},rules:true},
      orderBy:[{sortOrder:'asc'},{title:'asc'}],
    });
  }

  async create(tenantId:string,body:any){
    const storeId=String(body?.storeId||'');
    await this.assertStore(tenantId,storeId);

    const productIds=[...new Set<string>(
      (Array.isArray(body?.productIds)?body.productIds:[]).map((x:any)=>String(x))
    )];

    if(productIds.length){
      const count=await this.prisma.product.count({where:{id:{in:productIds},storeId}});
      if(count!==productIds.length) throw new BadRequestException('One or more products do not belong to store');
    }

    const title=String(body?.title||'').trim();
    if(!title) throw new BadRequestException('Collection title is required');

    return this.prisma.collection.create({
      data:{
        storeId,
        title,
        slug:this.slugify(body?.slug||title),
        description:body?.description||null,
        mode:String(body?.mode||'MANUAL').toUpperCase()==='AUTOMATED'?'AUTOMATED':'MANUAL',
        isActive:body?.isActive!==false,
        sortOrder:Number(body?.sortOrder||0),
        products:{create:productIds.map((productId:string,position:number)=>({productId,position}))},
        rules:{
          create:(Array.isArray(body?.rules)?body.rules:[]).map((r:any,position:number)=>({
            field:String(r?.field||''),
            operator:String(r?.operator||'equals'),
            value:r?.value??null,
            position,
          })),
        },
      },
      include:{products:true,rules:true},
    });
  }

  async update(tenantId:string,id:string,body:any){
    const storeId=String(body?.storeId||'');
    await this.assertStore(tenantId,storeId);

    const row=await this.prisma.collection.findFirst({where:{id,storeId}});
    if(!row) throw new NotFoundException('Collection not found');

    return this.prisma.$transaction(async tx=>{
      const data:any={};

      for(const key of ['title','description','isActive','sortOrder']){
        if(body?.[key]!==undefined)data[key]=body[key];
      }

      if(body?.slug!==undefined || body?.title!==undefined){
        data.slug=this.slugify(body?.slug||body?.title||row.slug);
      }

      if(body?.mode!==undefined){
        data.mode=String(body.mode).toUpperCase()==='AUTOMATED'?'AUTOMATED':'MANUAL';
      }

      await tx.collection.update({where:{id},data});

      if(Array.isArray(body?.productIds)){
        const ids=[...new Set<string>(body.productIds.map((x:any)=>String(x)))];
        const count=ids.length?await tx.product.count({where:{id:{in:ids},storeId}}):0;
        if(count!==ids.length)throw new BadRequestException('One or more products do not belong to store');

        await tx.collectionProduct.deleteMany({where:{collectionId:id}});
        if(ids.length){
          await tx.collectionProduct.createMany({
            data:ids.map((productId:string,position:number)=>({collectionId:id,productId,position}))
          });
        }
      }

      if(Array.isArray(body?.rules)){
        await tx.collectionRule.deleteMany({where:{collectionId:id}});
        if(body.rules.length){
          await tx.collectionRule.createMany({
            data:body.rules.map((r:any,position:number)=>({
              collectionId:id,
              field:String(r?.field||''),
              operator:String(r?.operator||'equals'),
              value:r?.value??null,
              position,
            }))
          });
        }
      }

      return tx.collection.findUnique({where:{id},include:{products:true,rules:true}});
    });
  }
}
