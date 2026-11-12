import defaults from './default-settings.json';
import type {CSSProperties} from 'react';

type AnyMap=Record<string,any>;
export type TicartiThemeSettings=typeof defaults & AnyMap;

const n=(v:any,f:number)=>Number.isFinite(Number(v))?Number(v):f;
const px=(v:any,f:number)=>`${n(v,f)}px`;
const transparent=(v:any)=>String(v??'').replace(/\s/g,'').toLowerCase()==='rgba(0,0,0,0)';
const fallback=(v:any,fb:string)=>transparent(v)||v===undefined||v===null||v===''?fb:String(v);
const font=(v:any,fb='Inter')=>String(v||fb).trim()||fb;

export function resolveTicartiThemeSettings(design:any):TicartiThemeSettings{
  const general=design?.general&&typeof design.general==='object'?design.general:{};
  const scoped=design?.themeSettings&&typeof design.themeSettings==='object'?design.themeSettings:{};
  const exact=scoped?.general&&typeof scoped.general==='object'?scoped.general:{};
  const s:any={...defaults,...exact};

  const map:AnyMap={
    color_base:general.textColor,
    color_accent:general.primaryColor||general.accentColor,
    color_background:general.backgroundColor,
    color_secondary_background:general.surfaceColor,
    color_lines:general.borderColor,
    color_heading:general.headingColor,
    color_desc:general.textColor,
    color_text_link:general.linkColor,
    google_font_name_body:general.bodyFont||general.paragraphFont,
    google_font_name_heading:general.headingFont,
    page_width:general.containerWidth||general.customWidth,
    top_normal_desktop:general.sectionSpacing,
    roundness:general.borderRadius,
    roundness_button:general.buttonRadius,
  };
  for(const [k,v] of Object.entries(map))if(s[k]===undefined&&(v!==undefined&&v!==null&&v!==''))s[k]=v;

  if((s.google_font_name_body===undefined||s.google_font_name_body==='')&&(general.bodyFont||general.paragraphFont)){
    s.body_font_type='google';
    s.google_font_name_body=general.bodyFont||general.paragraphFont;
  }
  if((s.google_font_name_heading===undefined||s.google_font_name_heading==='')&&general.headingFont){
    s.heading_font_type='google';
    s.google_font_name_heading=general.headingFont;
  }
  s.themeName=String(general.themeName||scoped.themeName||'Ticarti');
  return s as TicartiThemeSettings;
}

export function ticartiSettings(design:any){
  return resolveTicartiThemeSettings(design);
}

export function pageSettings(design:any,key:string){
  const direct=design?.[key];
  return direct&&typeof direct==='object'&&!Array.isArray(direct)?direct:{};
}

export function pageBlocks(design:any,key:string){
  const blocks=design?.[key]?.blocks;
  return Array.isArray(blocks)?blocks:[];
}

export function colorSetting(value:any,fallbackValue=''){
  return fallback(value,fallbackValue);
}

export function boolSetting(value:any,fallbackValue=false){
  if(value===undefined||value===null||value==='')return fallbackValue;
  if(typeof value==='boolean')return value;
  return !['false','0','off','disable','disabled','none','hide','hidden'].includes(String(value).toLowerCase());
}

export function ticartiCssVariables(s:TicartiThemeSettings):CSSProperties{
  const a:any=s;
  const bodyFamily=`'${font(a.google_font_name_body||a.bodyFont,'Inter')}', sans-serif`;
  const headingFamily=`'${font(a.google_font_name_heading||a.headingFont,'Inter')}', sans-serif`;
  const vars:AnyMap={
    '--font-body-family':bodyFamily,
    '--font-heading-family':headingFamily,
    '--font-button-family':bodyFamily,
    '--font-mainmenu-family':headingFamily,
    '--font-body-weight':String(n(a.google_font_weight_body,400)),
    '--font-heading-weight':String(n(a.google_font_weight_heading,600)),
    '--font-body-scale':String(n(a.body_scale,100)/100),
    '--font-heading-scale':String(n(a.heading_scale,100)/100),

    '--color-body-background':fallback(a.color_background,'#ffffff'),
    '--color-secondary-background':fallback(a.color_secondary_background,'#f7f7f7'),
    '--color-base':fallback(a.color_base,'#111111'),
    '--color-accent':fallback(a.color_accent,'#111111'),
    '--color-lines':fallback(a.color_lines,'#e5e7eb'),
    '--color-heading-main':fallback(a.color_heading,'var(--color-base)'),
    '--color-text-main':fallback(a.color_desc,'var(--color-base)'),
    '--color-text-link-main':fallback(a.color_text_link,'var(--color-accent)'),

    '--page-width':px(a.page_width,1400),
    '--page-padding':px(a.spacing_grid_horizontal,20),
    '--padding-wide-horizontal':px(a.padding_wide_horizontal,20),
    '--sections-top-spacing':px(a.top_normal_desktop,64),
    '--sections-top-spacing-mobile':px(a.top_normal_mobile,36),

    '--radius':px(a.roundness,8),
    '--radius-button':px(a.roundness_button,6),
    '--radius-input':px(a.roundness_input,6),
    '--radius-badge':px(a.roundness_badge,6),

    '--button-height':px(a.btn_min_height,40),
    '--form_field-height':'40px',
    '--duration-short':'.2s',
    '--duration-medium':'.3s',
    '--duration-large':'.5s',
    '--animation-bezier':'ease',
  };
  return vars as CSSProperties;
}

export function googleFontFamilies(s:TicartiThemeSettings){
  const a:any=s;
  const out:string[]=[];
  if(a.body_font_type==='google'&&a.google_font_name_body)out.push(String(a.google_font_name_body));
  if(a.heading_font_type==='google'&&a.google_font_name_heading)out.push(String(a.google_font_name_heading));
  if(a.button_font_type==='google'&&a.google_font_name_button)out.push(String(a.google_font_name_button));
  if(a.mainmenu_font_type==='google'&&a.google_font_name_mainmenu)out.push(String(a.google_font_name_mainmenu));
  return [...new Set(out)];
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

export function textAlignClass(value:any){
  const v=String(value||'').toLowerCase();
  if(v.includes('center'))return 'text-center';
  if(v.includes('right'))return 'text-right';
  return 'text-left';
}

export function cssBg(value:any){
  const v=String(value||'').trim();
  return v&&v!=='rgba(0,0,0,0)'?v:undefined;
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
