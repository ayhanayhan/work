'use client';
import {uiText,currentUiLocale} from '../i18n';

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
    if(!adapter){setError(uiText('payment.providerMissing',currentUiLocale()));return}
    try{
      setBusy(true);setError('');
      const result=await adapter.tokenize({holderName,number,expiry,cvc});
      setNumber('');setCvc('');onTokenized?.(result);
    }catch(e:any){setError(e?.message||uiText('payment.verifyFailed',currentUiLocale()))}finally{setBusy(false)}
  }

  return <section className="card-payment-fields" aria-label="Kart bilgileri">
    <div className="card-payment-grid">
      <label className="field full"><span>{uiText('deep.final2.300')}</span><input value={holderName} onChange={e=>setHolderName(e.target.value)} autoComplete="cc-name" placeholder=" "/></label>
      <label className="field full"><span>{uiText('deep.final2.301')}</span><input value={number} onChange={e=>setNumber(e.target.value.replace(/[^\d ]/g,''))} inputMode="numeric" autoComplete="cc-number" placeholder=" "/></label>
      <label className="field"><span>Son kullanma</span><input value={expiry} onChange={e=>setExpiry(e.target.value)} inputMode="numeric" autoComplete="cc-exp" placeholder=" "/></label>
      <label className="field"><span>CVC</span><input value={cvc} onChange={e=>setCvc(e.target.value.replace(/\D/g,'').slice(0,4))} inputMode="numeric" autoComplete="cc-csc" placeholder=" "/></label>
    </div>
    {error&&<div className="card-payment-error">{error}</div>}
    <button type="button" className="card-tokenize-button" disabled={busy||!adapter} onClick={()=>void tokenize()}>{busy?uiText('deep.final2.302'):uiText('deep.final2.303')}</button>
    <small className="card-security-note">{uiText('deep.final2.304')}</small>
  </section>;
}
