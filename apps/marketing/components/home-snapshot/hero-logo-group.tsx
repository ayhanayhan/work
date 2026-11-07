import type {HomeLogo} from '@/lib/home-content';
import {safeAssetUrl,textFor} from '@/lib/home-content';
export default function HeroLogoGroup({logos,locale}:{logos:HomeLogo[];locale:string}){
 return <div className="tc-ui-logos__group">
  {logos.filter(x=>x.enabled!==false&&x.assets?.image).map(logo=><div key={logo.id} className="tc-ui-logos__box">
   <img src={safeAssetUrl(logo.assets?.image,'')} alt={textFor(logo.fields?.title,locale)||'Mağaza logosu'} title={textFor(logo.fields?.title,locale)||undefined} decoding="async"/>
  </div>)}
 </div>;
}
