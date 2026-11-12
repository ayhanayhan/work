'use client';

import Link from 'next/link';
import {Check,ChevronUp,MonitorSmartphone,Plus,Settings2,ShoppingBag,Store} from 'lucide-react';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {cn} from '@/lib/utils';
import {useSalesChannel,AdminSalesChannel} from '@/app/(protected)/components/sales-channel-context';

const typeLabel=(v:string)=>({STOREFRONT:'Online Mağaza',POS:'POS',MANUAL:'Yönetim Paneli',MARKETPLACE:'Pazaryeri',B2B:'B2B',APP:'Uygulama',CUSTOM:'Özel Kanal'} as Record<string,string>)[v]||v;
function ChannelIcon({type,className}:{type?:string;className?:string}){
  const C=type==='STOREFRONT'?Store:type==='POS'?MonitorSmartphone:type==='MARKETPLACE'?ShoppingBag:Settings2;
  return <C className={cn('size-4',className)}/>;
}
function ChannelRow({channel,selected,onSelect}:{channel:AdminSalesChannel;selected:boolean;onSelect:()=>void}){
 return <button type="button" onClick={onSelect} className={cn('flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left hover:bg-muted',selected&&'bg-muted')}>
   <span className="grid size-8 shrink-0 place-items-center rounded-md border bg-background"><ChannelIcon type={channel.type}/></span>
   <span className="min-w-0 grow"><span className="block truncate text-sm font-medium">{channel.name}</span><span className="block truncate text-[11px] text-muted-foreground">{typeLabel(channel.type)}</span></span>
   {channel.active!==false&&<span className="size-1.5 shrink-0 rounded-full bg-emerald-500"/>}
   {selected&&<Check className="size-4 shrink-0 text-primary"/>}
 </button>
}

export function SalesChannelSwitcher(){
 const{channels,loading,selectedChannel,selectedChannelId,selectChannel}=useSalesChannel();
 const active=channels.filter(x=>x.active!==false);
 return <div className="p-3">
   <Popover>
     <PopoverTrigger asChild>
       <button type="button" className="flex w-full items-center gap-2.5 rounded-lg border bg-background px-2.5 py-2 text-left shadow-xs transition-colors hover:bg-muted/60">
         <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted"><ChannelIcon type={selectedChannel?.type}/></span>
         <span className="min-w-0 grow"><span className="block truncate text-xs text-muted-foreground">Satış kanalı</span><span className="block truncate text-sm font-medium">{selectedChannel?.name||'Tüm kanallar'}</span></span>
         <ChevronUp className="size-4 shrink-0 text-muted-foreground"/>
       </button>
     </PopoverTrigger>
     <PopoverContent side="top" align="start" sideOffset={8} className="w-[286px] p-2">
       <div className="px-2 pb-2 pt-1"><div className="text-sm font-semibold">Satış kanalı seç</div><div className="text-xs text-muted-foreground">Panel görünümünde çalışacağınız kanalı seçin.</div></div>
       <div className="max-h-[300px] overflow-y-auto">
         <button type="button" onClick={()=>selectChannel(null)} className={cn('flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left hover:bg-muted',!selectedChannelId&&'bg-muted')}>
           <span className="grid size-8 shrink-0 place-items-center rounded-md border bg-background"><Settings2 className="size-4"/></span>
           <span className="grow text-sm font-medium">Tüm kanallar</span>{!selectedChannelId&&<Check className="size-4 text-primary"/>}
         </button>
         {loading&&!active.length&&<div className="px-3 py-4 text-xs text-muted-foreground">Kanallar yükleniyor…</div>}
         {active.map(ch=><ChannelRow key={ch.id} channel={ch} selected={selectedChannelId===ch.id} onSelect={()=>selectChannel(ch.id)}/>)}
       </div>
       <div className="mt-2 border-t pt-2">
         <Link href="/settings/sales-channels?new=1" className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium hover:bg-muted"><Plus className="size-4"/>Yeni satış kanalı ekle</Link>
         <Link href="/settings/sales-channels" className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><Settings2 className="size-4"/>Satış kanallarını yönet</Link>
       </div>
     </PopoverContent>
   </Popover>
 </div>
}
