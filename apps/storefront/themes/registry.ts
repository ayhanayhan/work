import {themeModule as ticartiTheme} from './ticarti';
import type {ThemeModule} from './contracts/theme-contract';

export type ThemeResolutionInput={boot?:any;design?:any};

const themes:Record<string,ThemeModule>={
  ticarti:ticartiTheme,
};

export function resolveThemeId({boot,design}:ThemeResolutionInput){
  return String(
    design?.general?.packageSlug||
    boot?.theme?.slug||
    boot?.store?.activeTheme||
    'ticarti'
  );
}

export function getThemeModule(input:ThemeResolutionInput):ThemeModule{
  const id=resolveThemeId(input);
  return themes[id]||themes.ticarti;
}

export function getThemeShell(input:ThemeResolutionInput){
  return getThemeModule(input).Shell;
}

export function getRegisteredThemeIds(){
  return Object.keys(themes);
}
