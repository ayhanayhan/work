'use client';
import {useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';

type Variant={id:string;title?:string;sku?:string;price?:number;isActive?:boolean;selectedOptions?:Record<string,string>;inventory?:{available?:number};media?:Array<{image?:{url?:string}}>};
type Product={id:string;title:string;variants?:Variant[];options?:Array<{name:string;values?:Array<{name:string;hex?:string;color?:string}>}>};
const colorOption=(name:string)=>/^(renk|color|colour)$/i.test(name.trim());
export function PosVariantSelector({product,onAdd,money}:{product:Product;onAdd:(product:Product,variant:Variant)=>void;money:(amount:number)=>string}){
 const variants=(product.variants||[]).filter(v=>v.isActive!==false);
 const dimensions=useMemo(()=>{
   const keys=[...new Set(variants.flatMap(v=>Object.keys(v.selectedOptions||{})))];
   return keys.map(name=>({name,values:[...new Set(variants.map(v=>v.selectedOptions?.[name]).filter((v):v is string=>!!v))]}));
 },[product.variants]);
 const [choice,setChoice]=useState<Record<string,string>>({});
 const selected=dimensions.length?variants.find(v=>dimensions.every(d=>choice[d.name]&&v.selectedOptions?.[d.name]===choice[d.name])):variants[0];
 const available=(name:string,value:string)=>variants.some(v=>v.selectedOptions?.[name]===value&&dimensions.every(d=>d.name===name||!choice[d.name]||v.selectedOptions?.[d.name]===choice[d.name]));
 const choose=(name:string,value:string)=>setChoice(old=>{const next={...old,[name]:value};for(const d of dimensions){if(d.name===name||!next[d.name])continue;if(!variants.some(v=>Object.entries(next).every(([k,val])=>k===d.name||v.selectedOptions?.[k]===val)&&v.selectedOptions?.[d.name]===next[d.name]))delete next[d.name]}return next});
 return <div className="grid gap-3">
 {dimensions.map(d=><div key={d.name} className="grid gap-2"><div className="text-xs font-medium">{d.name}: {choice[d.name]||'Seçiniz'}</div><div className="flex flex-wrap gap-2">{d.values.map(value=>{const ok=available(d.name,value);const active=choice[d.name]===value;const opt=product.options?.find(o=>o.name===d.name)?.values?.find(v=>v.name===value);const hex=opt?.hex||opt?.color;return <button type="button" key={value} disabled={!ok} onClick={()=>choose(d.name,value)} aria-pressed={active} className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${active?'border-primary ring-1 ring-primary':'border-border'} ${!ok?'cursor-not-allowed opacity-40':''}`}>{colorOption(d.name)&&hex&&/^#[0-9a-fA-F]{3,8}$/.test(hex)?<span className="size-4 rounded-full border" style={{backgroundColor:hex}}/>:null}{value}</button>})}</div></div>)}
 {selected?<div className="flex items-center justify-between gap-2"><div className="text-xs text-muted-foreground">{selected.sku||selected.title||'Standart'} · {money(Number(selected.price||0))}{typeof selected.inventory?.available==='number'?` · Stok: ${selected.inventory.available}`:''}</div><Button size="sm" variant="outline" disabled={typeof selected.inventory?.available==='number'&&selected.inventory.available<=0} onClick={()=>onAdd(product,selected)}>Ekle</Button></div>:<div className="text-xs text-muted-foreground">{dimensions.length?'Varyant özelliklerini seçiniz.':'Satılabilir varyant bulunamadı.'}</div>}
 </div>;
}
