import TicartiThemeShell from './ticarti/ThemeShell';
import DefaultThemeShell from './default/ThemeShell';

export type ThemeResolutionInput={boot?:any;design?:any};

function normalize(v:any){return String(v??'').trim().toLowerCase();}

export function resolveThemeId({boot,design}:ThemeResolutionInput){
  const g=design?.general||{};
  if(g.themeEnabled===false||g.disableTheme===true)return 'default';
  const raw=g.themePackageId||g.themePackage||g.themeId||boot?.theme?.packageId||boot?.theme?.packageKey||boot?.theme?.slug||boot?.theme?.key||boot?.theme?.code||boot?.theme?.id||'';
  const key=normalize(raw);
  if(['default','basic','none','off','disabled'].includes(key))return 'default';
  if(['ticarti','signature','Theme','home 1','home-1','demo 1','demo-1'].includes(key))return 'ticarti';
  if(key)return 'ticarti';
  return 'ticarti';
}

export function getThemeShell(input:any){
  const id=typeof input==='object'&&input!==null?resolveThemeId(input):resolveThemeId({design:{general:{themeId:input}}});
  return id==='default'?DefaultThemeShell:TicartiThemeShell;
}
