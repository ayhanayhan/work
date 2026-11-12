'use client';

import {systemUrl} from '../lib/seo-route-contract';

import {createContext,useContext} from 'react';

type StorefrontThemeState={
  boot:any;
  design:any;
  sections:any[];
  menus:any[];
  runtime:any;
  isDesignPreview:boolean;
  sourceMode:string;
  debug?:any;
};

const StorefrontThemeContext=createContext<StorefrontThemeState|null>(null);

export function StorefrontThemeProvider({value,children}:{value:StorefrontThemeState;children:React.ReactNode}){
  return <StorefrontThemeContext.Provider value={value}>{children}</StorefrontThemeContext.Provider>;
}

export function useStorefrontTheme(){
  const value=useContext(StorefrontThemeContext);
  if(!value)throw new Error('useStorefrontTheme must be used inside StorefrontThemeProvider');
  return value;
}

/** Single URL generator for native storefront links. No hardcoded SEO aliases in components. */
export function useSeoPath(){
  const {boot}=useStorefrontTheme();
  const store=boot?.store||{};
  return (key:string)=>systemUrl(store?.settings?.seoAdvanced?.urlRouting,key,String(store?.locale||'tr'),String(store?.locale||'tr'));
}
