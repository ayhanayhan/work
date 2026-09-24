'use client';
import {useEffect,useMemo} from 'react';
import {googleFontFamilies,resolveTicartiThemeSettings,ticartiCssVariables} from '../config/theme-settings';
import {lingerieCssVariables} from '../config/lingerie-vars';

const css=[
'base.css','collection-list-type2.css','component-cart-drawer-recom.css','component-cart-drawer.css','component-cart-items.css','component-cart-notification.css','component-closed-menu.css','component-deferred-media.css','component-dynamic-blocks.css','component-facets--horizontal.css','component-facets--vertical.css','component-facets.css','component-featured-tabs.css','component-fixed-header.css','component-footer-accordion.css','component-free-delivery-bar.css','component-inputs.css','component-list-menu.css','component-localization-form.css','component-masonry.css','component-media-gallery.css','component-media-video-button.css','component-menu-drawer.css','component-menu-submenu.css','component-modal.css','component-model-viewer-ui.css','component-pagination.css','component-pickup-availability.css','component-predictive-search.css','component-price.css','component-product-card-list.css','component-product-card.css','component-product-model.css','component-review-stars.css','component-sticky-addtocart.css','component-sticky-header.css','component-swiper-slider.css','component-ticker.css','component-tiles-menu.css','component-toggle.css','component-tooltip.css','component-vertical-menu.css','component-visual-display-card.css','component-visual-display.css','customer.css','section-banner-collage.css','section-banner.css','section-banners-with-text-outside.css','section-blog-post-article.css','section-blog-post.css','section-collage.css','section-contact-form.css','section-footer.css','section-grid-of-products.css','section-header.css','section-image-comparison.css','section-list-of-products.css','section-lookbook.css','section-main-product.css','section-media-with-text-collage.css','section-media-with-text.css','section-password-header.css','section-slider.css','section-theme-review.css','swiper-bundle.min.css'
];
function safeCssValue(value:any){const out=String(value??'');if(!out||/[\n\r]/.test(out)||out.includes(':-webkit-scrollbar')||out.includes('not([src*=')||out==="url('data:image/svg+xml")return '';return out.replace(/<\/style/gi,'<\\/style')}
export default function ThemeHead({design,children}:{design:any;children:React.ReactNode}){
 const skinSlug=useMemo(()=>String(design?.general?.skinSlug||design?.general?.skin||'ticarti'),[design]);
 const effectiveDesign=design||{};
 const settings=useMemo(()=>resolveTicartiThemeSettings(effectiveDesign),[effectiveDesign]);
 const explicit=!!(design?.themeSettings&&Object.keys(design.themeSettings||{}).length);
 const exactLingerie=skinSlug==='lingerie-store';
 const vars=useMemo(()=>{const raw:any={...ticartiCssVariables(settings),...(exactLingerie?lingerieCssVariables:{}),...(explicit?ticartiCssVariables(settings):{})};if(exactLingerie){raw['--font-button-family']=raw['--font-body-family'];raw['--font-mainmenu-family']=raw['--font-body-family'];raw['--font-price-family']=raw['--font-body-family'];}for(const key of Object.keys(raw)){const value=safeCssValue(raw[key]);if(!key.startsWith('--')||!value)delete raw[key];else raw[key]=value}return raw as Record<string,string>},[settings,explicit,exactLingerie]);
 const cssVarsText=useMemo(()=>{const declarations=Object.entries(vars).map(([k,v])=>`${k}:${v}`).join(';');return `:root,body,.ticarti-theme{${declarations}}\n:root{--header-height:${exactLingerie?'60px':'60px'}}`;},[vars,exactLingerie]);
 useEffect(()=>{
   const id='ticarti-theme-runtime-vars';let style=document.getElementById(id) as HTMLStyleElement|null;if(!style){style=document.createElement('style');style.id=id;document.head.appendChild(style)}style.textContent=cssVarsText;
   const root=document.documentElement;const hadApple=root.classList.contains('apple-device');if(exactLingerie)root.classList.add('apple-device');document.body.dataset.ticartiTheme='ticarti';document.body.dataset.ticartiSkin=skinSlug;
   return()=>{if(style?.parentNode)style.parentNode.removeChild(style);if(!hadApple)root.classList.remove('apple-device');delete document.body.dataset.ticartiTheme;delete document.body.dataset.ticartiSkin}
 },[cssVarsText,exactLingerie,skinSlug]);
 useEffect(()=>{const families=googleFontFamilies(settings);const wanted=exactLingerie?['Roboto Flex','Prata']:(families.length?families:[]);const id='ticarti-theme-google-fonts';const old=document.getElementById(id) as HTMLLinkElement|null;if(!wanted.length){old?.remove();return}const href='https://fonts.googleapis.com/css2?'+wanted.map(x=>`family=${encodeURIComponent(x).replace(/%20/g,'+')}:wght@300;400;500;600;700;800;900`).join('&')+'&display=swap';if(old?.href===href)return;const el=old||document.createElement('link');el.id=id;el.rel='stylesheet';el.href=href;if(!old)document.head.appendChild(el)},[settings,exactLingerie]);
 return <div className="ticarti-theme" data-theme-id="ticarti" data-theme-name={String((settings as any).themeName||'Ticarti')} data-theme-skin={skinSlug}>
   {css.map(x=><link key={x} rel="stylesheet" href={'/themes/ticarti/assets/'+x}/>)}
   <link rel="stylesheet" href="/themes/ticarti/style-grid.css"/>
   <link rel="stylesheet" href="/themes/ticarti/header-runtime.css"/>
   <link rel="stylesheet" href="/themes/ticarti/source-runtime.css"/>
   <link rel="stylesheet" href="/themes/ticarti/wokiee-runtime.css"/>
   {exactLingerie&&<link rel="stylesheet" href="/themes/ticarti/lingerie-generated.css"/>}
   {children}
 </div>;
}
