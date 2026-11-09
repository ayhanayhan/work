import {NextRequest,NextResponse} from 'next/server';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const API=(process.env.API_ORIGIN||'http://localhost:4000').replace(/\/$/,'');
const ALLOWED=new Set(['https://ticarti.com','https://www.ticarti.com','https://help.ticarti.com']);
const noStore={'Cache-Control':'private, no-store, max-age=0','Vary':'Origin'};
function headersFor(req:NextRequest){
 const origin=req.headers.get('origin')||'';
 return {...noStore,...(ALLOWED.has(origin)?{'Access-Control-Allow-Origin':origin,
  'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Methods':'GET, OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type'}:{})};
}
/** Read-only merchant session presence on login.ticarti.com. Never expose tokens
 * or account data cross-origin; the site header only needs a boolean. */
export async function GET(req:NextRequest){
 const headers=headersFor(req);
 if(req.headers.get('origin')&&!ALLOWED.has(req.headers.get('origin')||'')){
  return NextResponse.json({authenticated:false},{status:403,headers});
 }
 const cookie=req.headers.get('cookie')||'';
 if(!cookie.includes('commerce_admin_refresh=')){
  return NextResponse.json({authenticated:false},{headers});
 }
 try{
  const response=await fetch(API+'/v1/merchant-auth/session',{
   method:'GET',cache:'no-store',signal:AbortSignal.timeout(4500),
   headers:{cookie,'x-auth-client':'merchant-landing',
    'user-agent':req.headers.get('user-agent')||''}
  });
  if(!response.ok)return NextResponse.json({authenticated:false},{headers});
  const data=await response.json();
  return NextResponse.json({authenticated:Array.isArray(data?.memberships)&&data.memberships.length>0},{headers});
 }catch{return NextResponse.json({authenticated:false},{headers});}
}
export function OPTIONS(req:NextRequest){
 return new NextResponse(null,{status:204,headers:headersFor(req)});
}
