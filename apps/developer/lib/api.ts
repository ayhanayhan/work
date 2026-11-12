export const API=process.env.NEXT_PUBLIC_API_URL||'/api';
export async function api(path:string,init:RequestInit={}){
  const token=typeof window!=='undefined'?localStorage.getItem('developer_token'):null;
  const locale=typeof window!=='undefined'?(document.documentElement.lang||localStorage.getItem('ticarti_locale')||localStorage.getItem('locale')||navigator.language):'tr';
  const headers:any={'content-type':'application/json','accept-language':locale,...(init.headers||{})};
  if(token)headers.authorization=`Bearer ${token}`;
  const r=await fetch(API+path,{...init,headers,cache:'no-store'});
  const text=await r.text();let data:any;try{data=JSON.parse(text)}catch{data=text}
  if(r.status===401&&typeof window!=='undefined'&&token){localStorage.removeItem('developer_token');if(!location.pathname.startsWith('/login'))location.href='/login'}
  if(!r.ok)throw new Error(data?.message||String(data||r.status));return data;
}
