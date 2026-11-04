'use client';

import {FormEvent,useEffect,useState} from 'react';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';

function jwtPayload(token:string){
  try{
    const part=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(atob(part.padEnd(Math.ceil(part.length/4)*4,'=')));
  }catch{return{}}
}

export default function BankTransferSettingsPage(){
  const[token,setToken]=useState('');
  const[storeId,setStoreId]=useState('');
  const[data,setData]=useState<any>(null);
  const[error,setError]=useState('');
  const[saving,setSaving]=useState(false);

  async function request(path:string,options:any={},access=token){
    const r=await fetch(API+path,{...options,credentials:'include',headers:{'content-type':'application/json','authorization':`Bearer ${access}`,...(options.headers||{})}});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(Array.isArray(j.message)?j.message.join(', '):j.message||'İşlem başarısız');
    return j;
  }

  useEffect(()=>{void(async()=>{
    try{
      const r=await fetch(API+'/merchant-auth/refresh',{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-auth-client':'merchant-admin'},body:'{}'});
      const j=await r.json().catch(()=>({}));
      if(!r.ok||!j.accessToken)throw new Error('Oturum bulunamadı');
      setToken(j.accessToken);
      const p:any=jwtPayload(j.accessToken);
      const sid=String(p.tenantId||p.storeId||p.tid||'');
      if(!sid)throw new Error('Aktif mağaza bulunamadı');
      setStoreId(sid);
      setData(await request(`/admin/store-settings/${encodeURIComponent(sid)}/bank-transfer`,{},j.accessToken));
    }catch(e:any){setError(e.message)}
  })()},[]);

  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const f:any=Object.fromEntries(new FormData(e.currentTarget));
    try{
      setSaving(true);setError('');
      const row=await request(`/admin/store-settings/${encodeURIComponent(storeId)}/bank-transfer`,{method:'PATCH',body:JSON.stringify({enabled:!!f.enabled,name:f.name,bankName:f.bankName,accountHolder:f.accountHolder,iban:f.iban,instructions:f.instructions})});
      setData({...data,...row});
    }catch(e:any){setError(e.message)}finally{setSaving(false)}
  }

  if(!data)return <main style={{padding:24}}>{error||'Yükleniyor…'}</main>;

  return <main style={{maxWidth:760,padding:24}}>
    <h1>Havale / EFT</h1>
    <p style={{color:'#6b7280'}}>Checkout’ta müşteriye gösterilecek banka hesabını yönetin.</p>
    {error&&<div style={{padding:12,background:'#fff3f3',color:'#a33',marginBottom:16}}>{error}</div>}
    <form onSubmit={save} style={{display:'grid',gap:14}}>
      <label><input type="checkbox" name="enabled" defaultChecked={data.enabled}/> Havale / EFT aktif</label>
      <label>Ödeme tipi adı<input name="name" defaultValue={data.name||'Havale / EFT'} style={{display:'block',width:'100%',padding:10,marginTop:6}}/></label>
      <label>Banka<input name="bankName" defaultValue={data.bankName||''} style={{display:'block',width:'100%',padding:10,marginTop:6}}/></label>
      <label>Hesap sahibi<input name="accountHolder" defaultValue={data.accountHolder||''} style={{display:'block',width:'100%',padding:10,marginTop:6}}/></label>
      <label>IBAN<input name="iban" defaultValue={data.iban||''} autoComplete="off" style={{display:'block',width:'100%',padding:10,marginTop:6}}/></label>
      <label>Ödeme açıklaması<textarea name="instructions" defaultValue={data.instructions||''} rows={4} style={{display:'block',width:'100%',padding:10,marginTop:6}}/></label>
      <button disabled={saving} style={{width:'fit-content',padding:'10px 18px'}}>{saving?'Kaydediliyor…':'Kaydet'}</button>
    </form>
  </main>;
}
