/* Server-side CMS read. Only Next.js server routes import this file. */
import type {HomeContent} from './home-content';
export async function getHomeContent(locale:string):Promise<HomeContent|null>{
 const origin=(process.env.API_ORIGIN||'').replace(/\/$/,'');
 if(!origin)return null;
 try{
  const response=await fetch(origin+'/v1/public/website/home?lang='+encodeURIComponent(locale),
    {cache:'no-store',signal:AbortSignal.timeout(6000)});
  if(!response.ok)return null;
  const data=await response.json();
  if(!data||!Array.isArray(data.modules)||typeof data.version!=='number')return null;
  return {locale,version:data.version,modules:data.modules,disabledModuleIds:Array.isArray(data.disabledModuleIds)?data.disabledModuleIds:[],consentContract:data.consentContract};
 }catch{return null;}
}
