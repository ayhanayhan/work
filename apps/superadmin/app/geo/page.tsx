'use client';

import {useEffect,useState} from 'react';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';

export default function GeoManagementPage(){
  const[token,setToken]=useState('');
  const[countryCode,setCountryCode]=useState('TR');
  const[admin1,setAdmin1]=useState<any[]>([]);
  const[admin2,setAdmin2]=useState<any[]>([]);
  const[selected,setSelected]=useState<any>(null);
  const[error,setError]=useState('');

  async function req(path:string,options:any={},access=token){
    const r=await fetch(API+path,{...options,credentials:'include',headers:{'content-type':'application/json','authorization':`Bearer ${access}`,...(options.headers||{})}});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(Array.isArray(j.message)?j.message.join(', '):j.message||'İşlem başarısız');
    return j;
  }

  async function loadCountry(access=token,code=countryCode){
    setError('');
    const rows=await req(`/superadmin/geo?countryCode=${encodeURIComponent(code)}&level=ADMIN1`,{},access);
    setAdmin1(rows);setAdmin2([]);setSelected(null);
  }

  async function pick(row:any){
    setSelected(row);
    setAdmin2(await req(`/superadmin/geo?parentId=${encodeURIComponent(row.id)}&level=ADMIN2`));
  }

  async function patch(row:any,body:any){
    const updated=await req(`/superadmin/geo/${encodeURIComponent(row.id)}`,{method:'PATCH',body:JSON.stringify(body)});
    setAdmin1(xs=>xs.map(x=>x.id===updated.id?updated:x));
    setAdmin2(xs=>xs.map(x=>x.id===updated.id?updated:x));
  }

  useEffect(()=>{void(async()=>{
    try{
      const r=await fetch(API+'/superadmin-auth/refresh',{method:'POST',credentials:'include',headers:{'content-type':'application/json','x-auth-client':'superadmin'},body:'{}'});
      const j=await r.json().catch(()=>({}));
      if(!r.ok||!j.accessToken)throw new Error('Super Admin oturumu bulunamadı');
      setToken(j.accessToken);
      await loadCountry(j.accessToken,'TR');
    }catch(e:any){setError(e.message)}
  })()},[]);

  return <main style={{padding:24}}>
    <div style={{display:'flex',alignItems:'end',gap:10,marginBottom:18}}>
      <label>Ülke kodu<input value={countryCode} onChange={e=>setCountryCode(e.target.value.toUpperCase())} maxLength={2} style={{display:'block',padding:8,width:90,marginTop:5}}/></label>
      <button onClick={()=>void loadCountry()} style={{padding:'9px 14px'}}>Yükle</button>
    </div>
    <h1>Ülke / İl / İlçe Yönetimi</h1>
    <p style={{color:'#6b7280'}}>Bu tablo platform genelidir. Merchant mağazaları yalnız aktif kayıtları okur; kendi bölge tablosunu değiştiremez.</p>
    {error&&<div style={{padding:12,background:'#fff3f3',color:'#a33'}}>{error}</div>}
    <div style={{display:'grid',gridTemplateColumns:'minmax(280px,1fr) minmax(320px,1fr)',gap:24,marginTop:20}}>
      <section>
        <h2>İl / Eyalet</h2>
        <div style={{display:'grid',gap:6}}>
          {admin1.map(row=><div key={row.id} style={{display:'grid',gridTemplateColumns:'1fr auto auto',gap:8,alignItems:'center',padding:8,border:'1px solid #e5e7eb'}}>
            <button onClick={()=>void pick(row)} style={{textAlign:'left',background:'none',border:0,cursor:'pointer'}}>{row.name}</button>
            <input type="number" value={row.sortOrder||0} onChange={e=>void patch(row,{sortOrder:Number(e.target.value)})} style={{width:64}}/>
            <input type="checkbox" checked={row.isActive!==false} onChange={e=>void patch(row,{isActive:e.target.checked})}/>
          </div>)}
        </div>
      </section>
      <section>
        <h2>{selected?`${selected.name} ilçeleri`:'İlçe'}</h2>
        <div style={{display:'grid',gap:6}}>
          {admin2.map(row=><div key={row.id} style={{display:'grid',gridTemplateColumns:'1fr auto auto',gap:8,alignItems:'center',padding:8,border:'1px solid #e5e7eb'}}>
            <input value={row.name} onChange={e=>setAdmin2(xs=>xs.map(x=>x.id===row.id?{...x,name:e.target.value}:x))} onBlur={e=>void patch(row,{name:e.target.value})} style={{padding:6}}/>
            <input type="number" value={row.sortOrder||0} onChange={e=>void patch(row,{sortOrder:Number(e.target.value)})} style={{width:64}}/>
            <input type="checkbox" checked={row.isActive!==false} onChange={e=>void patch(row,{isActive:e.target.checked})}/>
          </div>)}
        </div>
      </section>
    </div>
  </main>;
}
