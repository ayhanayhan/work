'use client';

import {useState} from 'react';

export type CardTokenResult={provider:string;token:string;last4?:string;brand?:string};
export type CardPaymentAdapter={provider:string;tokenize:(input:{holderName:string;number:string;expiry:string;cvc:string})=>Promise<CardTokenResult>};

type Props={enabled?:boolean;adapter?:CardPaymentAdapter|null;onTokenized?:(result:CardTokenResult)=>void};

export default function CardPaymentFields({enabled=false,adapter=null,onTokenized}:Props){
  const[holderName,setHolderName]=useState('');
  const[number,setNumber]=useState('');
  const[expiry,setExpiry]=useState('');
  const[cvc,setCvc]=useState('');
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  if(!enabled)return null;

  async function tokenize(){
    if(!adapter){setError('Kart sağlayıcısı henüz bağlanmadı.');return}
    try{
      setBusy(true);setError('');
      const result=await adapter.tokenize({holderName,number,expiry,cvc});
      setNumber('');setCvc('');onTokenized?.(result);
    }catch(e:any){setError(e?.message||'Kart doğrulanamadı.')}finally{setBusy(false)}
  }

  return <section className="card-payment-fields" aria-label="Kart bilgileri">
    <div className="card-payment-grid">
      <label className="field full"><span>Kart üzerindeki isim</span><input value={holderName} onChange={e=>setHolderName(e.target.value)} autoComplete="cc-name" placeholder=" "/></label>
      <label className="field full"><span>Kart numarası</span><input value={number} onChange={e=>setNumber(e.target.value.replace(/[^\d ]/g,''))} inputMode="numeric" autoComplete="cc-number" placeholder=" "/></label>
      <label className="field"><span>Son kullanma</span><input value={expiry} onChange={e=>setExpiry(e.target.value)} inputMode="numeric" autoComplete="cc-exp" placeholder=" "/></label>
      <label className="field"><span>CVC</span><input value={cvc} onChange={e=>setCvc(e.target.value.replace(/\D/g,'').slice(0,4))} inputMode="numeric" autoComplete="cc-csc" placeholder=" "/></label>
    </div>
    {error&&<div className="card-payment-error">{error}</div>}
    <button type="button" className="card-tokenize-button" disabled={busy||!adapter} onClick={()=>void tokenize()}>{busy?'Doğrulanıyor…':'Kartı doğrula'}</button>
    <small className="card-security-note">Ham kart numarası ve CVC Ticarti sunucusuna gönderilmez. Ödeme sağlayıcısı bağlandığında bu alan tokenizasyon adaptörünü kullanır.</small>
  </section>;
}
