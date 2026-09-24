'use client';

export type SavedListKind='wishlist'|'compare';
const key=(kind:SavedListKind)=>`ticarti-${kind}`;
export function readSavedIds(kind:SavedListKind):string[]{
  if(typeof window==='undefined')return [];
  try{const value=JSON.parse(localStorage.getItem(key(kind))||'[]');return Array.isArray(value)?value.map(String).filter(Boolean):[]}catch{return []}
}
export function writeSavedIds(kind:SavedListKind,ids:string[]){
  if(typeof window==='undefined')return;
  const clean=Array.from(new Set(ids.map(String).filter(Boolean))).slice(0,40);
  localStorage.setItem(key(kind),JSON.stringify(clean));
  window.dispatchEvent(new CustomEvent('ticarti-saved-list-change',{detail:{kind,ids:clean}}));
}
export function hasSavedId(kind:SavedListKind,id:string){return readSavedIds(kind).includes(String(id))}
export function toggleSavedId(kind:SavedListKind,id:string){
  const raw=String(id);const ids=readSavedIds(kind);const next=ids.includes(raw)?ids.filter(x=>x!==raw):[...ids,raw];writeSavedIds(kind,next);return next.includes(raw)
}
