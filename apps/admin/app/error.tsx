'use client';
import { useEffect } from 'react';
import { Icon } from '@iconify/react';
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  useEffect(()=>{console.error('[commerce-admin]',error)},[error]);
  return <main className="commerce-auth-page commerce-error-page"><div className="commerce-auth-wrap"><div className="card commerce-auth-card border-0 shadow-sm">
    <div className="card-body p-0 commerce-auth-header rounded-top"><div className="text-center p-4"><a href="/" className="commerce-auth-brand"><span>C</span><b>Commerce</b></a></div></div>
    <div className="card-body commerce-auth-body text-center py-5"><div className="commerce-error-code">500</div><div className="commerce-error-icon"><Icon icon="iconoir:warning-triangle"/></div><h4 className="mt-3">Bu sayfa yüklenemedi</h4><p className="text-muted mb-4">Beklenmeyen bir hata oluştu. Oturumunuz korunuyor.</p><div className="d-flex justify-content-center gap-2"><button className="btn btn-primary" onClick={reset}>Tekrar Dene</button><a className="btn btn-light" href="/dashboard">Ana Sayfa</a></div>{error?.message&&<code className="commerce-error-message">{error.message}</code>}</div>
  </div></div></main>;
}
