'use client';

import { useEffect, useState } from 'react';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';

export function ScreenLoader() {
  const [icon,setIcon]=useState('/brand/ticarti-icon.svg');
  useEffect(()=>{let live=true;fetch(`${API}/platform/branding`,{credentials:'include'}).then(r=>r.ok?r.json():null).then(x=>{const url=x?.branding?.iconUrl||x?.branding?.logoUrl;if(live&&url)setIcon(String(url))}).catch(()=>{});return()=>{live=false}},[]);
  return (
    <div className="flex flex-col items-center gap-2 justify-center fixed inset-0 z-50 transition-opacity duration-700 ease-in-out bg-background">
      <img className="h-[36px] w-[36px] object-contain max-w-none" src={icon} alt="Ticarti" />
      <div className="text-muted-foreground font-medium text-sm">Yükleniyor...</div>
    </div>
  );
}
