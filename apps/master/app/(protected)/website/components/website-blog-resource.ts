/** One data access contract for website blog posts and categories.
 * All callers use MasterSession.request for authentication and error handling.
 * Never seed editor records or replace real API responses with mock data.
 */
export type MasterApiRequest=(path:string,init?:RequestInit)=>Promise<any>;
export type BlogSnapshot<TPost=any,TCategory=any>={
  version:number;
  posts:TPost[];
  categories:TCategory[];
};
export async function readWebsiteBlog<TPost=any,TCategory=any>(request:MasterApiRequest):Promise<BlogSnapshot<TPost,TCategory>>{
  const value=await request('/superadmin/website/blog');
  if(!value||!Number.isFinite(value.version)||!Array.isArray(value.posts)||!Array.isArray(value.categories)){
    throw new Error('Blog verisi beklenen formatta değil.');
  }
  return value as BlogSnapshot<TPost,TCategory>;
}
export async function saveWebsiteBlog<TPost=any,TCategory=any>(
  request:MasterApiRequest,snapshot:BlogSnapshot<TPost,TCategory>
):Promise<BlogSnapshot<TPost,TCategory>>{
  const result=await request('/superadmin/website/blog',{
    method:'PATCH',body:JSON.stringify(snapshot)
  });
  if(!result||!Number.isFinite(result.version)||!Array.isArray(result.posts)||!Array.isArray(result.categories)){
    throw new Error('Blog kayıt yanıtı geçersiz.');
  }
  return result as BlogSnapshot<TPost,TCategory>;
}
