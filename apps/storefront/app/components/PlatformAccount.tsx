'use client';
import {useEffect,useState} from 'react';
const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
type Membership={tenantId:string;tenantName:string;site:{name:string;publicSlug:string;domain?:string|null;logoUrl?:string|null}};
export default function PlatformAccount({label='Giriş Yap'}:{label?:string}){
 const[ready,setReady]=useState(false);const[session,setSession]=useState<any>(null);
 useEffect(()=>{let alive=true;void(async()=>{try{const r=await fetch(API+'/merchant-auth/session',{credentials:'include',cache:'no-store',headers:{'x-auth-client':'merchant-landing'}});if(!r.ok)return;const j=await r.json();if(alive&&j?.authenticated)setSession(j)}catch{}finally{if(alive)setReady(true)}})();return()=>{alive=false}},[]);
 if(!ready)return <span className="ticarti-account-skeleton" aria-hidden="true"/>;
 if(!session)return <a href="https://login.ticarti.com/">{label}</a>;
 const memberships:Membership[]=Array.isArray(session.memberships)?session.memberships:[];const m=memberships[0];
 const target=m?`https://login.ticarti.com/?returnTo=${encodeURIComponent(`https://${m.site.domain||`${m.site.publicSlug}.ticarti.com`}/admin`)}`:'https://login.ticarti.com/';
 const name=String(m?.site?.name||session?.user?.name||session?.user?.email||'Hesabım');const logo=m?.site?.logoUrl;
 return <a className="ticarti-account-chip" href={target} title="Yönetim paneline git">{logo?<img src={logo} alt=""/>:<i>{name.slice(0,1).toUpperCase()}</i>}<span><b>{name}</b><small>{memberships.length>1?`${memberships.length} mağaza`:'Yönetim paneli'}</small></span></a>;
}
