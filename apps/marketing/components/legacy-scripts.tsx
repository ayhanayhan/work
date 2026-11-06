'use client';
import {useEffect} from 'react';

/** Loads the already-approved original scripts in source order after React mounts.
 * The source pages use ordinary <a> links (full navigations), so their event listeners
 * never accumulate across soft navigation. */
export default function LegacyScripts({sources,htmlClasses}:{sources:string[];htmlClasses:string}){
  const key=sources.join('|');
  useEffect(()=>{
    document.documentElement.className=htmlClasses;
    let stopped=false;
    const injected:HTMLScriptElement[]=[];
    (async()=>{
      for(const url of sources){
        if(stopped)break;
        await new Promise<void>(resolve=>{
          const node=document.createElement('script');
          node.src=url;node.async=false;
          node.onload=()=>resolve();node.onerror=()=>resolve();
          injected.push(node);document.body.appendChild(node);
        });
      }
    })();
    return()=>{stopped=true;injected.forEach(n=>n.remove());};
  },[key,htmlClasses]);
  return null;
}
