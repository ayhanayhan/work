'use client';
import {useEffect,useMemo,useState} from 'react';
export type UiLocale='tr'|'en'|'de'|'ru';
export function normalizeUiLocale(v?:string|null):UiLocale{const x=String(v||'').toLowerCase().replace('_','-').split('-')[0];return x==='en'||x==='de'||x==='ru'||x==='tr'?x:'tr'}
export function useUiI18n(dict:Record<UiLocale,Record<string,string>>){const[locale,setLocale]=useState<UiLocale>('tr');useEffect(()=>{const detect=()=>setLocale(normalizeUiLocale(document.documentElement.lang||localStorage.getItem('ticarti_locale')||localStorage.getItem('locale')||navigator.language));detect();const o=new MutationObserver(detect);o.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});window.addEventListener('storage',detect);return()=>{o.disconnect();window.removeEventListener('storage',detect)}},[]);return useMemo(()=>({locale,t:(k:string)=>dict[locale]?.[k]||dict.en?.[k]||dict.tr?.[k]||k}),[locale,dict])}
