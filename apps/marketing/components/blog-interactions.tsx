'use client';
import {useEffect} from 'react';
export default function BlogInteractions(){
  useEffect(()=>{
    const archive=document.getElementById('tc-blog-archive');
    if(!archive)return;
    const filter=(category:string)=>{
      archive.querySelectorAll<HTMLElement>('#tc-blog-cards [data-tc-blog-category]').forEach(card=>{
        card.hidden=category!=='Tümü'&&card.dataset.tcBlogCategory!==category;
      });
    };
    const onChange=(event:Event)=>{
      const control=event.target;
      if(control instanceof HTMLInputElement&&control.name==='tc-blog-category')filter(control.value);
    };
    archive.addEventListener('change',onChange);
    filter('Tümü');
    return()=>archive.removeEventListener('change',onChange);
  },[]);
  return null;
}
