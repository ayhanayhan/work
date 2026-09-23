'use client';
import {useEffect,useMemo} from 'react';
import {googleFontFamilies,resolveTicartiThemeSettings,ticartiCssVariables} from '../config/theme-settings';
import {lingerieCssVariables} from '../config/lingerie-vars';
import {mergeSkinDesign,resolveTicartiSkin} from '../config/skin-registry';

const css=[
'base.css','collection-list-type2.css','component-cart-drawer-recom.css','component-cart-drawer.css','component-cart-items.css','component-cart-notification.css','component-closed-menu.css','component-deferred-media.css','component-dynamic-blocks.css','component-facets--horizontal.css','component-facets--vertical.css','component-facets.css','component-featured-tabs.css','component-fixed-header.css','component-footer-accordion.css','component-free-delivery-bar.css','component-inputs.css','component-list-menu.css','component-localization-form.css','component-masonry.css','component-media-gallery.css','component-media-video-button.css','component-menu-drawer.css','component-menu-submenu.css','component-modal.css','component-model-viewer-ui.css','component-pagination.css','component-pickup-availability.css','component-predictive-search.css','component-price.css','component-product-card-list.css','component-product-card.css','component-product-model.css','component-review-stars.css','component-sticky-addtocart.css','component-sticky-header.css','component-swiper-slider.css','component-ticker.css','component-tiles-menu.css','component-toggle.css','component-tooltip.css','component-vertical-menu.css','component-visual-display-card.css','component-visual-display.css','customer.css','section-banner-collage.css','section-banner.css','section-banners-with-text-outside.css','section-blog-post-article.css','section-blog-post.css','section-collage.css','section-contact-form.css','section-footer.css','section-grid-of-products.css','section-header.css','section-image-comparison.css','section-list-of-products.css','section-lookbook.css','section-main-product.css','section-media-with-text-collage.css','section-media-with-text.css','section-password-header.css','section-slider.css','section-wokiee-review.css','swiper-bundle.min.css'
];
export default function ThemeHead({design,children}:{design:any;children:React.ReactNode}){
 const skin=useMemo(()=>resolveTicartiSkin(design),[design]);
 const effectiveDesign=useMemo(()=>mergeSkinDesign(design,skin),[design,skin]);
 const settings=useMemo(()=>resolveTicartiThemeSettings(effectiveDesign),[effectiveDesign]);
 const explicit=!!(design?.themeSettings&&Object.keys(design.themeSettings||{}).length);
 const exactLingerie=skin.slug==='lingerie-store';
 const vars=useMemo(()=>{const raw:any={...ticartiCssVariables(settings),...(exactLingerie?lingerieCssVariables:{}),...(explicit?ticartiCssVariables(settings):{})};if(exactLingerie){raw['--font-button-family']=raw['--font-body-family'];raw['--font-mainmenu-family']=raw['--font-body-family'];raw['--font-price-family']=raw['--font-body-family'];}for(const key of Object.keys(raw)){const value=String(raw[key]??'');if(!key.startsWith('--')||/[\n\r]/.test(value)||value.includes(':-webkit-scrollbar')||value.includes('not([src*=')||value==="url('data:image/svg+xml")delete raw[key]}return raw as any},[settings,explicit,exactLingerie]);
 useEffect(()=>{
   const root=document.documentElement;const body=document.body;
   const previousRoot=new Map<string,string>();const previousBody=new Map<string,string>();
   for(const [key,value] of Object.entries(vars)){previousRoot.set(key,root.style.getPropertyValue(key));previousBody.set(key,body.style.getPropertyValue(key));root.style.setProperty(key,String(value));body.style.setProperty(key,String(value))}
   const oldHeaderHeight=root.style.getPropertyValue('--header-height');root.style.setProperty('--header-height',exactLingerie?'60px':oldHeaderHeight||'60px');
   const hadApple=root.classList.contains('apple-device');if(exactLingerie)root.classList.add('apple-device');
   body.dataset.ticartiTheme='ticarti';body.dataset.ticartiSkin=skin.slug;
   return()=>{for(const [key,value] of previousRoot)value?root.style.setProperty(key,value):root.style.removeProperty(key);for(const [key,value] of previousBody)value?body.style.setProperty(key,value):body.style.removeProperty(key);if(oldHeaderHeight)root.style.setProperty('--header-height',oldHeaderHeight);else root.style.removeProperty('--header-height');if(!hadApple)root.classList.remove('apple-device');delete body.dataset.ticartiTheme;delete body.dataset.ticartiSkin}
 },[vars,exactLingerie,skin.slug]);
 useEffect(()=>{const families=googleFontFamilies(settings);const wanted=exactLingerie?['Roboto Flex','Prata']:(families.length?families:[]);const id='ticarti-theme-google-fonts';const old=document.getElementById(id) as HTMLLinkElement|null;if(!wanted.length){old?.remove();return}const href='https://fonts.googleapis.com/css2?'+wanted.map(x=>`family=${encodeURIComponent(x).replace(/%20/g,'+')}:wght@300;400;500;600;700;800;900`).join('&')+'&display=swap';if(old?.href===href)return;const el=old||document.createElement('link');el.id=id;el.rel='stylesheet';el.href=href;if(!old)document.head.appendChild(el)},[settings,exactLingerie]);
 return <div className="ticarti-theme" data-theme-id="ticarti" data-theme-name={String((settings as any).themeName||'Ticarti')} data-theme-skin={skin.slug} style={vars}>
   {css.map(x=><link key={x} rel="stylesheet" href={'/themes/ticarti/assets/'+x}/>)}
   <link rel="stylesheet" href="/themes/ticarti/style-grid.css"/>
   <link rel="stylesheet" href="/themes/ticarti/header-runtime.css"/>
   <link rel="stylesheet" href="/themes/ticarti/source-runtime.css"/>
   {exactLingerie&&<link rel="stylesheet" href="/themes/ticarti/lingerie-generated.css"/>}
   {children}
 </div>;
}
