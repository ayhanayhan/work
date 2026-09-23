'use client';
import {useEffect,useMemo} from 'react';
import {googleFontFamilies,resolveTicartiThemeSettings,ticartiCssVariables} from '../config/theme-settings';

const css=[
'base.css','component-inputs.css','component-list-menu.css','component-menu-submenu.css','component-menu-drawer.css','component-modal.css','component-predictive-search.css','component-localization-form.css','component-price.css','component-product-card.css','component-product-card-list.css','component-swiper-slider.css','swiper-bundle.min.css','component-ticker.css','component-dynamic-blocks.css','component-toggle.css','component-visual-display.css','component-deferred-media.css','component-media-gallery.css','component-featured-tabs.css','component-facets.css','component-facets--horizontal.css','component-facets--vertical.css','component-cart-drawer.css','component-cart-items.css','component-footer-accordion.css','section-header.css','section-footer.css','section-announcement-bar.css','section-banner-collage.css','section-featured-collection.css','section-collection-list.css','section-main-product.css','section-main-collection-product-grid.css','section-slideshow.css','section-image-banner.css','section-rich-text.css','section-gallery.css','section-lookbook.css','section-blog-posts.css','section-blog-post.css','section-blog-post-article.css'
];
export default function ThemeHead({design,children}:{design:any;children:React.ReactNode}){
 const settings=useMemo(()=>resolveTicartiThemeSettings(design),[design]);
 const vars=useMemo(()=>ticartiCssVariables(settings),[settings]);
 useEffect(()=>{const families=googleFontFamilies(settings);const id='ticarti-theme-google-fonts';const old=document.getElementById(id) as HTMLLinkElement|null;if(!families.length){old?.remove();return}const href='https://fonts.googleapis.com/css2?'+families.map(x=>`family=${encodeURIComponent(x).replace(/%20/g,'+')}:wght@300;400;500;600;700;800;900`).join('&')+'&display=swap';if(old?.href===href)return;const el=old||document.createElement('link');el.id=id;el.rel='stylesheet';el.href=href;if(!old)document.head.appendChild(el)},[settings]);
 return <div className="ticarti-theme" data-theme-id="ticarti" data-theme-name={String((settings as any).themeName||'Ticarti')} style={vars}>
   {css.map(x=><link key={x} rel="stylesheet" href={'/themes/ticarti/assets/'+x}/>)}
   <link rel="stylesheet" href="/themes/ticarti/style-grid.css"/>
   {children}
 </div>;
}
