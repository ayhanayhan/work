import {Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import {Storage} from '@google-cloud/storage';
import {GoogleAuth} from 'google-auth-library';
@Injectable()
export class StoreLifecycleService{
 private storage=new Storage();private auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']});
 constructor(private prisma:PrismaService){}
 private async removeDomain(domain:string){if(!domain)return;try{const project=String(process.env.FIREBASE_PROJECT_ID||process.env.GOOGLE_CLOUD_PROJECT||'wedidit-64fae');const location=String(process.env.APP_HOSTING_LOCATION||'europe-west4');const backend=String(process.env.APP_HOSTING_STOREFRONT_BACKEND||'commerce-storefront');const client=await this.auth.getClient();const a:any=await client.getAccessToken();const token=typeof a==='string'?a:a?.token;if(!token)return;await fetch(`https://firebaseapphosting.googleapis.com/v1/projects/${project}/locations/${location}/backends/${backend}/domains/${encodeURIComponent(domain)}`,{method:'DELETE',headers:{authorization:`Bearer ${token}`}})}catch{}}
 async purgeDue(){const due=await this.prisma.tenant.findMany({where:{deletionConfirmedAt:{not:null},deletionScheduledAt:{lte:new Date()}},select:{id:true,name:true,domain:true,publicSlug:true}});const bucket=String(process.env.GCS_BUCKET||'').trim();const results:any[]=[];for(const store of due){try{if(bucket)await this.storage.bucket(bucket).deleteFiles({prefix:`tenants/${store.id}/`}).catch(()=>undefined);if(store.domain)await this.removeDomain(store.domain);await this.prisma.tenant.delete({where:{id:store.id}});results.push({id:store.id,deleted:true})}catch(e:any){results.push({id:store.id,deleted:false,error:e?.message||String(e)})}}return{checked:due.length,results}}
}
