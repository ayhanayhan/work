'use client';
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <div style={{padding:32,fontFamily:'Inter,system-ui,sans-serif'}}><div className="panel"><h2>Sayfa yüklenirken bir hata oluştu</h2><p className="muted">{error?.message||'Beklenmeyen istemci hatası'}</p><button className="btn" onClick={reset}>Tekrar Dene</button></div></div>;
}
