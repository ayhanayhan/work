import type {ComponentType, ReactNode} from 'react';

export const THEME_CONTRACT_VERSION='1.0.0' as const;

export type ThemeSurface='storefront';
export type ThemePageKey='home'|'collection'|'product'|'cart'|'blog'|'article'|'content'|'account'|'wishlist'|'compare';

export type ThemeBoot={
  store?:Record<string,unknown>;
  theme?:Record<string,unknown>;
  design?:Record<string,unknown>;
  [key:string]:unknown;
};

export type ThemeDesign={
  general?:Record<string,unknown>;
  header?:Record<string,unknown>;
  footer?:Record<string,unknown>;
  homepage?:Record<string,unknown>;
  products?:Record<string,unknown>;
  [key:string]:unknown;
};

export type ThemeShellProps={boot:ThemeBoot;design:ThemeDesign;children:ReactNode};
export type ThemePageProps={slug?:string;locale?:string};

export type ThemeManifest={
  id:string;
  name:string;
  version:string;
  contractVersion:typeof THEME_CONTRACT_VERSION;
  surface:ThemeSurface;
  entry:'index.ts';
  assetsDir:'assets'|'public'|null;
  capabilities:ReadonlyArray<'sections'|'settings'|'menus'|'custom-css'|'responsive'|'rtl'>;
};

export type ThemeModule={
  manifest:ThemeManifest;
  Shell:ComponentType<ThemeShellProps>;
  pages:Partial<Record<ThemePageKey,ComponentType<any>>>;
};
