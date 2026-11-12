export function boolSetting(value:any,fallbackValue=false){
  if(value===undefined||value===null||value==='')return fallbackValue;
  if(typeof value==='boolean')return value;
  return !['false','0','off','disable','disabled','none','hide','hidden'].includes(String(value).toLowerCase());
}

export function numSetting(value:any,fallbackValue:number,min=-Infinity,max=Infinity){
  const parsed=Number(value);
  const valueNumber=Number.isFinite(parsed)?parsed:fallbackValue;
  return Math.max(min,Math.min(max,valueNumber));
}

export function stringSetting(value:any,fallbackValue=''){
  return value===undefined||value===null||value===''?fallbackValue:String(value);
}

export function firstSetting(...values:any[]){
  return values.find(v=>v!==undefined&&v!==null&&v!=='');
}

export type ThemeLayoutBlock={
  type:string;
  id?:string;
  settings?:Record<string,any>;
};

export type ThemeLayoutRow={
  id?:string;
  className?:string;
  blocks?:ThemeLayoutBlock[];
};

export type ThemeLayoutDefinition={
  id:string;
  name?:string;
  type:'header'|'footer'|string;
  settings?:Record<string,any>;
  rows?:ThemeLayoutRow[];
};

export function themeLayouts(design:any){
  const raw=design?.layouts&&typeof design.layouts==='object'?design.layouts:{};
  return {
    headers:Array.isArray(raw.headers)?raw.headers:[],
    footers:Array.isArray(raw.footers)?raw.footers:[],
    defaults:raw.defaults&&typeof raw.defaults==='object'?raw.defaults:{},
    pageAssignments:raw.pageAssignments&&typeof raw.pageAssignments==='object'?raw.pageAssignments:{},
  };
}

export function activeThemeLayout(design:any,type:'header'|'footer'):ThemeLayoutDefinition|null{
  const layouts=themeLayouts(design);
  const rows=type==='header'?layouts.headers:layouts.footers;
  const general=design?.general&&typeof design.general==='object'?design.general:{};
  const scoped=design?.themeSettings?.general&&typeof design.themeSettings.general==='object'?design.themeSettings.general:{};
  const direct=type==='header'
    ? firstSetting(general.activeHeader,scoped.active_header,scoped.activeHeader,layouts.defaults.header)
    : firstSetting(general.activeFooter,scoped.active_footer,scoped.activeFooter,layouts.defaults.footer);
  const selected=String(direct||'');
  const found=rows.find((row:any)=>String(row?.id||'')===selected)||rows[0];
  return found&&typeof found==='object'?found as ThemeLayoutDefinition:null;
}
