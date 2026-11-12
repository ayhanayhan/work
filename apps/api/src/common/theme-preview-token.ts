import { createHmac, timingSafeEqual } from 'crypto';

function secret(){
  const value=String(process.env.THEME_PREVIEW_SECRET||process.env.MERCHANT_JWT_SECRET||'').trim();
  if(!value) throw new Error('THEME_PREVIEW_SECRET (or MERCHANT_JWT_SECRET) is required');
  return value;
}
function b64(v:string){return Buffer.from(v).toString('base64url')}
function sign(payload:string){return createHmac('sha256',secret()).update(payload).digest('base64url')}
export function createThemePreviewToken(storeId:string,themeId:string,ttlSeconds=900){
  const exp=Math.floor(Date.now()/1000)+Math.max(60,Math.min(3600,ttlSeconds));
  const payload=b64(JSON.stringify({v:1,storeId,themeId,exp}));
  return {token:`${payload}.${sign(payload)}`,expiresAt:new Date(exp*1000).toISOString()};
}
export function verifyThemePreviewToken(token:string,storeId:string,themeId:string){
  try{
    const [payload,sig]=String(token||'').split('.'); if(!payload||!sig)return false;
    const expected=sign(payload); const a=Buffer.from(sig),b=Buffer.from(expected); if(a.length!==b.length||!timingSafeEqual(a,b))return false;
    const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    return data?.v===1&&String(data.storeId)===String(storeId)&&String(data.themeId)===String(themeId)&&Number(data.exp)>Math.floor(Date.now()/1000);
  }catch{return false}
}
