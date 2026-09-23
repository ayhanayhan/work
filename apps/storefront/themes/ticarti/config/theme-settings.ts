import defaults from './default-settings.json';
import type {CSSProperties} from 'react';

type AnyMap=Record<string,any>;
export type TicartiThemeSettings=typeof defaults & AnyMap;

const n=(v:any,f:number)=>Number.isFinite(Number(v))?Number(v):f;
const px=(v:any,f:number)=>`${n(v,f)}px`;
const transparent=(v:any)=>String(v??'').replace(/\s/g,'').toLowerCase()==='rgba(0,0,0,0)';
const fallback=(v:any,fb:string)=>transparent(v)||v===undefined||v===null||v===''?fb:String(v);
const rgb=(value:any)=>{const s=String(value||'').trim();let m=s.match(/^#([0-9a-f]{6})$/i);if(m){const q=parseInt(m[1],16);return `${q>>16}, ${(q>>8)&255}, ${q&255}`}m=s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);return m?`${m[1]}, ${m[2]}, ${m[3]}`:'0, 0, 0'};
const alpha=(value:any,a:number)=>{const r=rgb(value).split(',').map(x=>x.trim());return `rgba(${r[0]}, ${r[1]}, ${r[2]}, ${a})`};
const fontName=(value:any,fb:string)=>{if(value&&typeof value==='object'&&value.family)return String(value.family);const s=String(value||'');const known:Record<string,string>={inter_n4:'Inter',inter_n5:'Inter',inter_n7:'Inter'};return known[s]||fb};

export function resolveTicartiThemeSettings(design:any):TicartiThemeSettings{
  const legacy=design?.general||{};
  const scoped=design?.themeSettings||design?.theme?.settings||design?.themes?.ticarti?.settings||{};
  const sourceVersion=String(legacy?.themeSourceVersion||'');
  const useLegacy=sourceVersion.startsWith('ticarti-')||!!legacy?.skinSlug||!!legacy?.skin;
  const g=useLegacy?legacy:{...scoped.general};
  const p=useLegacy?(design?.products||{}):{...scoped.products};
  const h=useLegacy?(design?.header||{}):{...scoped.header};
  const f=useLegacy?(design?.footer||{}):{...scoped.footer};
  const exactSource:any={...(scoped.general||{})};
  const s:any={...defaults};
  const map:AnyMap={
    color_base:g.textColor,color_accent:g.primaryColor,color_background:g.backgroundColor,color_secondary_background:g.surfaceColor,color_lines:g.borderColor,
    color_heading:g.headingColor,color_desc:g.textColor,color_text_link:g.linkColor,
    google_font_name_body:g.bodyFont,google_font_name_heading:g.headingFont,
    page_width:g.containerWidth,padding_wide_horizontal:g.pagePadding,spacing_grid_horizontal:g.gridSpacing,
    top_normal_desktop:g.sectionSpacing,roundness:g.borderRadius,roundness_button:g.buttonRadius,roundness_input:g.inputRadius,roundness_badge:g.badgeRadius,
    product_card_price_size_custom_desktop:p.priceSizeDesktop,product_card_price_size_custom_mobile:p.priceSizeMobile,
    header_background:h.backgroundColor,footer_background:f.backgroundColor
  };
  for(const [k,v] of Object.entries(map))if(v!==undefined&&v!==null&&v!=='')s[k]=v;
  for(const [k,v] of Object.entries(exactSource))if(v!==undefined&&v!==null&&v!=='')s[k]=v;
  if(g.bodyFont){s.body_font_type='google';s.google_font_name_body=g.bodyFont}
  if(g.headingFont){s.heading_font_type='google';s.google_font_name_heading=g.headingFont}
  if(g.baseFontSize)s.body_scale=Math.round(n(g.baseFontSize,16)/16*100);
  if(g.headingScale)s.heading_scale=n(g.headingScale,100);
  s.themeName=String(legacy.themeName||scoped.themeName||'Ticarti');
  return s;
}

export function ticartiCssVariables(s:TicartiThemeSettings):CSSProperties{
  const a:any=s;
  const bodyFamily=a.body_font_type==='google'?`'${a.google_font_name_body||'Inter'}', sans-serif`:`'${fontName(a.type_body_font,'Inter')}', sans-serif`;
  const headingFamily=a.heading_font_type==='google'?`'${a.google_font_name_heading||'Inter'}', sans-serif`:`'${fontName(a.type_header_font,'Inter')}', sans-serif`;
  const buttonFamily=a.button_font_type==='google'?`'${a.google_font_name_button||fontName(a.type_font_button,'Inter')}', sans-serif`:bodyFamily;
  const menuFamily=a.mainmenu_font_type==='google'?`'${a.google_font_name_mainmenu||fontName(a.type_font_mainmenu,'Inter')}', sans-serif`:headingFamily;
  const h456Family=a.h4h5h6_font_type==='google'?`'${a.google_font_name_h4h5h6||fontName(a.type_font_h4h5h6,'Inter')}', sans-serif`:headingFamily;
  const priceFamily=a.price_font_type==='google'?`'${a.google_font_name_price||fontName(a.type_font_price,'Inter')}', sans-serif`:headingFamily;
  const bodyWeight=n(a.google_font_weight_body,400), bodyBold=n(a.google_font_weight_body_bold,700), headingWeight=n(a.google_font_weight_heading,500);
  const vars:AnyMap={
    '--duration-short':'.2s','--duration-medium':'.3s','--duration-large':'.5s','--animation-bezier':'ease',
    '--font-body-family':bodyFamily,'--font-body-style':'normal','--font-body-weight':String(bodyWeight),'--font-body-weight-bold':String(bodyBold),
    '--font-heading-family':headingFamily,'--font-heading-style':'normal','--font-heading-weight':String(headingWeight),'--font-heading-line-height':'normal',
    '--font-button-family':buttonFamily,'--font-button-style':'normal','--font-button-weight':String(a.button_font_type==='google'?n(a.google_font_weight_button,bodyBold):(a.buttons_font_weight==='strong'?bodyBold:bodyWeight)),
    '--font-mainmenu-family':menuFamily,'--font-mainmenu-style':'normal','--font-mainmenu-weight':String(n(a.google_font_weight_mainmenu,headingWeight)),
    '--font-h4h5h6-family':h456Family,'--font-h4h5h6-style':'normal','--font-h4h5h6-weight':String(n(a.google_font_weight_h4h5h6,headingWeight)),
    '--font-price-family':priceFamily,'--font-price-style':'normal','--font-price-weight':String(n(a.google_font_weight_price,headingWeight)),
    '--font-heading-scale':String(n(a.heading_scale,100)/100),'--font-body-scale':String(n(a.body_scale,100)/100),
    '--font-h4h5h6_scale':String(n(a.h4h5h6_scale,100)/100),'--font-price_scale':String(n(a.price_scale,100)/100),'--font-button_scale':String(n(a.button_scale,100)/100),'--font-mainmenu_scale':String(n(a.mainmenu_scale,100)/100),
    '--color-body-background':a.color_background,'--color-body-background-rgb':rgb(a.color_background),'--color-secondary-background':a.color_secondary_background,'--color-secondary-background-rgb':rgb(a.color_secondary_background),'--color-section-background':'var(--color-secondary-background)',
    '--color-base':a.color_base,'--color-base-rgb':rgb(a.color_base),'--color-accent':a.color_accent,'--color-lines':a.color_lines,'--color-error':a.color_alert,
    '--color-media-background':a.color_media_background,'--color-media-background-hover':a.color_media_background_hover,
    '--color-media-icon-main':fallback(a.color_media_icon,'var(--color-base)'),'--color-media-icon-hover-main':fallback(a.color_media_icon_hover,'var(--color-base)'),
    '--swiper-pagination-bullet-main':fallback(a.color_media_dots,'var(--color-base)'),'--swiper-pagination-arrow-main':fallback(a.color_media_arrows,'var(--color-base)'),
    '--color-tooltip-text':a.color_tooltip_text,'--color-heading-main':fallback(a.color_heading,'var(--color-base)'),'--color-subheading-main':fallback(a.color_subheading,'var(--color-accent)'),
    '--color-text-main':fallback(a.color_desc,'var(--color-base)'),'--color-text-link-main':fallback(a.color_text_link,'var(--color-accent)'),'--color-text-link-hover-main':fallback(a.color_text_link_hover,'var(--color-accent)'),
    '--color-text-icons-main':fallback(a.color_text_icons,'var(--color-base)'),'--color-icons-main':fallback(a.color_icons,'var(--color-base)'),'--color-icons-hover-main':fallback(a.color_icons_hover,'var(--color-accent)'),
    '--color-social-icons-main':fallback(a.color_social_icons,'var(--color-base)'),'--color-social-icons-hover-main':fallback(a.color_social_icons_hover,'var(--color-accent)'),
    '--color-tooltip-main':fallback(a.color_tooltip,'var(--color-accent)'),'--color-img-overlay-hex':a.image_overlay_color,'--color-img-overlay':rgb(a.image_overlay_color),'--color-image-overlay':'var(--color-img-overlay, var(--color-base-rgb))','--color-image-overlay-hex':'var(--color-img-overlay-hex, var(--color-base))',
    '--color-card-text-main':fallback(a.color_card_text,'var(--color-base)'),'--color-product-name-main':fallback(a.color_product_name,'var(--color-base)'),'--color-product-name-main-hover':fallback(a.color_product_name_hover,'var(--color-accent)'),
    '--color-price-main':fallback(a.color_price,'var(--color-accent)'),'--color-save-price':a.color_save_price,'--color-old-price-main':fallback(a.color_old_price,'var(--color-accent)'),
    '--color-meta-products-main':fallback(a.color_meta_products,'var(--color-base)'),'--color-meta-products-main-hover':fallback(a.color_meta_products_hover,'var(--color-accent)'),
    '--color-save-badge':a.color_save_badge,'--color-save-badge-text':a.color_save_badge_text,'--color-featured-badge':a.color_featured_badge,'--color-featured-badge-text':a.color_featured_badge_text,
    '--color-soldout-badge-main':fallback(a.color_soldout_badge,'var(--color-base)'),'--color-soldout-badge-text':a.color_soldout_badge_text,
    '--color-interface-button':a.color_interface_button,'--color-interface-button-text-main':fallback(a.color_interface_button_text,'var(--color-base)'),'--color-interface-button-hover-main':fallback(a.color_interface_button_hover,'var(--color-base)'),'--color-interface-button-text-hover':a.color_interface_button_text_hover,
    '--color-interface-button-external':a.color_interface_button_external,'--color-interface-button-text-main-external':fallback(a.color_interface_button_text_external,'var(--color-base)'),'--color-interface-button-hover-main-external':fallback(a.color_interface_button_hover_external,'var(--color-base)'),'--color-interface-button-text-hover-external':a.color_interface_button_text_hover_external,
    '--color-countdown-bg':a.color_countdown_bg,'--color-countdown-text-main':fallback(a.color_countdown_text,'var(--color-base)'),'--color-image-preloader-bg':a.image_preloader_bg_color,
    '--color-rating-active-main':a.color_active_rating,'--color-rating-base-main':a.color_base_rating,'--color-free-delivery-bar-main':fallback(a.color_free_delivery_bar,'var(--color-base)'),'--color-free-delivery-bar-text-main':fallback(a.color_free_delivery_bar_text,'var(--color-base)'),'--color-free-delivery-bar-full':a.color_free_delivery_bar_full,
    '--color-simple-dropdown':a.color_background,'--radius-menu':px(a.roundness_submenu,8),'--shadow-modal':'4px 8px 20px 0px','--shadow-color-black':'#000000','--shadow-modal-color':'#00000017',
    '--shadow':a.show_shadow?`4px 8px 20px 0 ${alpha(a.color_shadow,.15)}`:'none','--shadow-mobile':a.show_shadow?`4px 8px 20px 0 ${alpha(a.color_shadow,.4)}`:'none',
    '--animation-underline-thin':px(a.underline_thin,1),'--radius':px(a.roundness,20),'--radius-image':px(a.roundness_icon_image,8),'--radius-input':px(a.roundness_input,8),'--radius-badge':px(a.roundness_badge,8),'--radius-button':px(a.roundness_button,8),'--radius-button-product-page':px(a.roundness_button_product_page,8),'--radius-checkbox':px(a.roundness_checkbox,4),'--radius-table':px(a.roundness_table,8),'--radius-color-picker':px(a.roundness_color_picker,100),'--radius-button-swatches':px(a.roundness_button_swatches,8),'--radius-tooltip':px(a.roundness_tooltip,8),
    '--color-input-border':a.color_input_border,'--color-input-background-active':a.color_input_background_hover,'--color-input-outline-active':a.color_input_outline_hover,'--form_field-height':'40px',
    '--button-height':px(a.btn_min_height,40),'--button-height-mob':px(a.btn_min_height_mobile,40),'--button-width-wide':px(a.btn_wide_width,300),'--button-height-big':px(a.btn_min_height_pr,50),'--button-height-big-mob':px(a.btn_min_height_mobile_pr,45),'--button-card-width':a.btn_pr_card_width_type==='big'?'100%':'auto','--button-card-width-mob':a.btn_pr_card_width_type_mobile==='big'?'100%':'auto',
    '--product-card-price-size':px(a.product_card_price_size_custom_desktop,16),'--product-card-price-size-mobile':px(a.product_card_price_size_custom_mobile,14),
    '--color-input-background-main':fallback(a.color_input_background,'var(--color-secondary-background)'),'--color-input-text-main':fallback(a.color_input_text,'var(--color-base)'),'--color-input-icon-main':fallback(a.color_input_icon,'var(--color-base)'),'--color-input-border-active-main':fallback(a.color_input_border_hover,'var(--color-accent)'),'--color-input-text-active-main':fallback(a.color_input_text_hover,'var(--color-base)'),'--color-input-icon-active-main':fallback(a.color_input_icon_hover,'var(--color-accent)'),
    '--color-checkbox-background':fallback(a.color_checkbox_background,'var(--color-secondary-background)'),'--color-checkbox-border':a.color_checkbox_border,'--color-checkbox-text':fallback(a.color_checkbox_text,'var(--color-base)'),'--color-checkbox-background-focused':fallback(a.color_checkbox_background_hover,'var(--color-base)'),'--color-checkbox-border-focused':fallback(a.color_checkbox_border_hover,'var(--color-base)'),'--color-checkbox-text-hover':fallback(a.color_checkbox_hover,'var(--color-base)'),'--color-checkbox-icon-focused':a.color_checkbox_icon_hover,
    '--color-link-button':fallback(a.color_link_button,'var(--color-accent)'),'--color-link-button-icon':fallback(a.color_link_button_icon,'var(--color-accent)'),'--color-link-button-hover':fallback(a.color_link_button_hover,'var(--color-base)'),'--color-link-button-icon-hover':fallback(a.color_link_button_icon_hover,'var(--color-base)'),
    '--shadow-header':a.show_shadow_header?`${n(a.horizontal_length_header,0)}px ${n(a.vertical_length_header,4)}px ${n(a.blur_radius_header,20)}px 0 ${alpha(a.color_shadow_header,n(a.shadow_opacity_header,15)/100)}`:'none',
    '--shadow-header-mobile':a.show_shadow_header_mobile?`${n(a.horizontal_length_header_mobile,0)}px ${n(a.vertical_length_header_mobile,4)}px ${n(a.blur_radius_header_mobile,20)}px 0 ${alpha(a.color_shadow_header_mobile,n(a.shadow_opacity_header_mobile,15)/100)}`:'none',
    '--shadow-header-mobile-invert':a.show_shadow_header_mobile?`${n(a.horizontal_length_header_mobile,0)}px ${-n(a.vertical_length_header_mobile,4)}px ${n(a.blur_radius_header_mobile,20)}px 0 ${alpha(a.color_shadow_header_mobile,n(a.shadow_opacity_header_mobile,15)/100)}`:'none',
    '--color_button_reset_all_main':'var(--color_button_reset_all, var(--color-base))','--color_button_reset_all_hover_main':'var(--color_button_reset_all_hover, var(--color-accent))',
    '--main-text-top-offset':'20px','--main-text-bottom-offset':'0px','--main-text-section-top-offset':'16px','--main-form-elements-top-offset':'16px','--main-row-gap-mobile':'15px',
    '--product-name-size':`calc(${n(a.product_name_size,16)}px * var(--font-body-scale))`,'--product-name-size-mobile':`calc(${n(a.product_name_size_mobile,14)}px * var(--font-body-scale))`,'--color-background-pagination-hover':'#F5F5F5',
    '--font-body-size':'calc(16px * var(--font-body-scale))','--font-body-line-height':'normal','--font-body2-size':'calc(14px * var(--font-body-scale))','--font-body2-line-height':'normal','--font-body3-size':'calc(12px * var(--font-body-scale))','--font-body3-line-height':'normal','--font-body3-size-no-scale':'12px',
    '--page-width':px(a.page_width,1600),'--padding-wide-horizontal':px(a.padding_wide_horizontal,20),'--page-padding':px(a.spacing_grid_horizontal,20),'--padding-wide-horizontal-tablet':px(Math.min(n(a.padding_wide_horizontal,20),40),20),'--page-padding-phone':'15px',
    '--sections-top-spacing':px(a.top_normal_desktop,100),'--sections-top-spacing-mobile':px(a.top_normal_mobile,50),'--sections-top-spacing--medium':px(a.top_medium_desktop,60),'--sections-top-spacing--medium-mobile':px(a.top_medium_mobile,40),'--sections-top-spacing--small':px(a.top_small_desktop,20),'--sections-top-spacing--small-mobile':px(a.top_small_mobile,15),
    '--default-svg-placeholder-aspect-ratio':'1.3325','--default-svg-placeholder-aspect-ratio-square':'1','--auto-text-color-button-light':'#ffffff','--auto-text-color-button-dark':'#000000','--auto-base-bg-color-text':'#000000','--auto-accent-color-bg':a.color_accent,'--auto-accent-color-text':'#ffffff'
  };
  return vars as CSSProperties;
}

export function googleFontFamilies(s:TicartiThemeSettings){const out:string[]=[];const a:any=s;[['body_font_type','google_font_name_body'],['heading_font_type','google_font_name_heading'],['button_font_type','google_font_name_button'],['mainmenu_font_type','google_font_name_mainmenu'],['h4h5h6_font_type','google_font_name_h4h5h6'],['price_font_type','google_font_name_price']].forEach(([t,nm])=>{if(a[t]==='google'&&a[nm])out.push(String(a[nm]))});return [...new Set(out)]}
