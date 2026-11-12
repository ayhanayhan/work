'use client';
import {saText} from './lib/text-i18n';
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <div style={{padding:32,fontFamily:'Inter,system-ui,sans-serif'}}><div className="panel"><h2>{saText('deep.final3.118')}</h2><p className="muted">{error?.message||saText('deep.final3.119')}</p><button className="btn" onClick={reset}>{saText('deep.final3.120')}</button></div></div>;
}
