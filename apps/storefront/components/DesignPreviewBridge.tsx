'use client';

import {useEffect} from 'react';

const SOURCE='commerce-design-preview';
const EDITOR='commerce-design-editor';

function targetNode(value:string){
  if(!value)return null;
  const nodes=Array.from(document.querySelectorAll<HTMLElement>('[data-design-target]'));
  return nodes.find(node=>node.dataset.designTarget===value)||null;
}
function visualNode(node:HTMLElement|null){
  if(!node)return null;
  if(node.classList.contains('design-section-anchor'))return node.firstElementChild as HTMLElement|null;
  return node;
}
function clearSelection(){document.querySelectorAll<HTMLElement>('.ticarti-design-selected').forEach(node=>node.classList.remove('ticarti-design-selected'))}
function selectTarget(value:string,scroll=true){
  clearSelection(); if(!value)return;
  const anchor=targetNode(value); const visual=visualNode(anchor); if(!anchor||!visual)return;
  visual.classList.add('ticarti-design-selected');
  if(anchor.dataset.designLabel)visual.dataset.designLabel=anchor.dataset.designLabel;
  if(scroll)visual.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
}

export default function DesignPreviewBridge(){
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    if(params.get('ticarti_design')!=='1')return;
    if(params.get('ticarti_source')==='demo')(window as any).__TICARTI_DESIGN_DRAFTS__={};
    document.documentElement.classList.add('ticarti-design-mode');
    const style=document.createElement('style');
    style.dataset.ticartiDesign='1';
    style.textContent=`
      .ticarti-design-mode [data-design-target]{cursor:pointer!important;}
      .ticarti-design-mode .ticarti-design-selected{outline:3px solid #22c58b!important;outline-offset:-3px!important;box-shadow:0 0 0 5px rgba(34,197,139,.18)!important;position:relative!important;z-index:5!important;}
      .ticarti-design-mode .ticarti-design-selected::after{content:attr(data-design-label);position:absolute;top:8px;left:8px;z-index:2147483000;background:#12a875;color:#fff;font:700 11px/1.1 Inter,Arial,sans-serif;padding:6px 8px;border-radius:6px;box-shadow:0 3px 12px rgba(0,0,0,.14);pointer-events:none;}
      .ticarti-design-mode [data-design-target]:hover{outline:2px solid rgba(34,197,139,.55);outline-offset:-2px;}
      .design-section-anchor{display:contents;}
    `;
    document.head.appendChild(style);
    const onClick=(event:MouseEvent)=>{
      const origin=event.target as HTMLElement|null;
      const anchor=origin?.closest?.('[data-design-target]') as HTMLElement|null;
      if(!anchor)return;
      const target=String(anchor.dataset.designTarget||''); if(!target)return;
      const interactive=origin?.closest?.('button,a,input,select,textarea,summary,details,video,[role=button]');
      selectTarget(target,false); window.parent.postMessage({source:SOURCE,target},'*');
      if(interactive)return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    };
    const onMessage=(event:MessageEvent)=>{
      const payload=event.data;
      if(!payload||payload.source!==EDITOR)return;
      if(payload.action==='select'){selectTarget(String(payload.target||''),true);return;}
      if(payload.action==='draft'){
        const runtime=window as any;
        runtime.__TICARTI_DESIGN_DRAFTS__={...(runtime.__TICARTI_DESIGN_DRAFTS__||{}),[String(payload.kind||'unknown')]:payload};
        window.dispatchEvent(new CustomEvent('ticarti-design-draft',{detail:payload}));
      }
    };
    const onSubmit=(event:Event)=>{event.preventDefault();event.stopPropagation()};
    document.addEventListener('click',onClick,true); document.addEventListener('submit',onSubmit,true); window.addEventListener('message',onMessage);
    window.parent.postMessage({source:SOURCE,target:'',ready:true},'*');
    return()=>{clearSelection();document.documentElement.classList.remove('ticarti-design-mode');style.remove();document.removeEventListener('click',onClick,true);document.removeEventListener('submit',onSubmit,true);window.removeEventListener('message',onMessage)};
  },[]);
  return null;
}
