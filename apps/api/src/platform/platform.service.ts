import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  plans(){
    return this.prisma.plan.findMany({
      where:{isActive:true},
      orderBy:[{sortOrder:'asc'},{monthlyPrice:'asc'}],
      select:{
        id:true,name:true,code:true,description:true,monthlyPrice:true,yearlyPrice:true,currency:true,
        trialDays:true,maxStaff:true,maxProducts:true,maxOrdersPerMonth:true,features:true,sortOrder:true,
      },
    });
  }

  apps(){
    return this.prisma.appDefinition.findMany({
      where:{isActive:true},
      orderBy:[{isFeatured:'desc'},{sortOrder:'asc'},{name:'asc'}],
      select:{
        id:true,slug:true,name:true,category:true,summary:true,description:true,icon:true,developer:true,
        kind:true,provider:true,integrationType:true,basePrice:true,currency:true,billingType:true,isFeatured:true,sortOrder:true,
      },
    });
  }

}
