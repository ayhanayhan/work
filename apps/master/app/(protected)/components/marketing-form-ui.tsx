'use client';
import {ReactNode} from 'react';
import {Label} from '@/components/ui/label';
import {Switch} from '@/components/ui/switch';

export function FormField({label,hint,required,error,children,className=''}:{label:string;hint?:string;required?:boolean;error?:string;children:ReactNode;className?:string}){
  return <div className={`grid gap-2 ${className}`}><div className="flex items-center justify-between gap-3"><Label className="text-sm font-medium">{label}{required&&<span className="ms-1 text-destructive">*</span>}</Label>{hint&&<span className="text-[11px] text-muted-foreground">{hint}</span>}</div>{children}{error&&<p className="text-xs text-destructive">{error}</p>}</div>
}
export function FormSection({title,description,children,className=''}:{title:string;description?:string;children:ReactNode;className?:string}){
  return <section className={`grid gap-4 rounded-xl border bg-card p-4 ${className}`}><div><h3 className="font-semibold">{title}</h3>{description&&<p className="mt-1 text-xs text-muted-foreground">{description}</p>}</div>{children}</section>
}
export function SwitchField({label,description,checked,onCheckedChange}:{label:string;description?:string;checked:boolean;onCheckedChange:(v:boolean)=>void}){
  return <div className="flex items-start justify-between gap-4 rounded-lg border p-3"><div><div className="text-sm font-medium">{label}</div>{description&&<p className="mt-1 text-xs text-muted-foreground">{description}</p>}</div><Switch checked={checked} onCheckedChange={onCheckedChange}/></div>
}
