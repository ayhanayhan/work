import TicartiThemeShell from './ticarti/ThemeShell';
import DefaultThemeShell from './default/ThemeShell';
export function getThemeShell(id:any){const key=String(id||'ticarti').toLowerCase();if(key==='ticarti')return TicartiThemeShell;return DefaultThemeShell}
