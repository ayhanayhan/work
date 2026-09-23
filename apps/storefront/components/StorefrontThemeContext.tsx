'use client';

import {createContext,useContext} from 'react';

type StorefrontThemeState={
  boot:any;
  design:any;
  sections:any[];
  menus:any[];
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
