'use client';
import {useEffect,useMemo} from 'react';
import {googleFontFamilies,resolveTicartiThemeSettings,ticartiCssVariables} from '../config/theme-settings';

const css=[
'base.css','collection-list-type2.css','component-cart-drawer-recom.css','component-cart-drawer.css','component-cart-items.css','component-cart-notification.css','component-closed-menu.css','component-deferred-media.css','component-dynamic-blocks.css','component-facets--horizontal.css','component-facets--vertical.css','component-facets.css','component-featured-tabs.css','component-fixed-header.css','component-footer-accordion.css','component-free-delivery-bar.css','component-inputs.css','component-list-menu.css','component-localization-form.css','component-masonry.css','component-media-gallery.css','component-media-video-button.css','component-menu-drawer.css','component-menu-submenu.css','component-modal.css','component-model-viewer-ui.css','component-pagination.css','component-pickup-availability.css','component-predictive-search.css','component-price.css','component-product-card-list.css','component-product-card.css','component-product-model.css','component-review-stars.css','component-sticky-addtocart.css','component-sticky-header.css','component-swiper-slider.css','component-ticker.css','component-tiles-menu.css','component-toggle.css','component-tooltip.css','component-vertical-menu.css','component-visual-display-card.css','component-visual-display.css','customer.css','section-banner-collage.css','section-banner.css','section-banners-with-text-outside.css','section-blog-post-article.css','section-blog-post.css','section-collage.css','section-contact-form.css','section-footer.css','section-grid-of-products.css','section-header.css','section-image-comparison.css','section-list-of-products.css','section-lookbook.css','section-main-product.css','section-media-with-text-collage.css','section-media-with-text.css','section-password-header.css','section-slider.css','section-wokiee-review.css','swiper-bundle.min.css'
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
