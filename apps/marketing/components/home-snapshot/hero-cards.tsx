import type {HomeItem} from '@/lib/home-content';
import {safeAssetUrl,textFor} from '@/lib/home-content';

/** CMS-only hero cards. Empty/undefined items always render empty, never sample data. */
export default function HeroCards({clone=false,items=[],locale='tr'}:{
 clone?:boolean;items?:HomeItem[];locale?:string
}){
 return <>{items.filter(item=>item.enabled!==false&&Boolean(item.assets?.image)&&
   (textFor(item.fields?.heading,locale)||textFor(item.fields?.description,locale))).map(item=>
    <article key={item.id} className="tc-ui-card" data-clone={clone?'1':undefined}
      aria-hidden={clone||undefined}>
     <div className="tc-ui-card__photo">
      <img className="tc-ui-card__img" alt={textFor(item.fields?.heading,locale)||''}
       src={safeAssetUrl(item.assets?.image,'')}/>
      <div className="tc-ui-card__prev">
       <span className="tc-ui-card__prev-label">{textFor(item.fields?.description,locale)||textFor(item.fields?.heading,locale)}</span>
       {item.assets?.logo?<div className="tc-ui-card__logos">
        <img className="tc-ui-card__logo" src={safeAssetUrl(item.assets.logo,'')}
         alt={textFor(item.fields?.heading,locale)||''}/>
       </div>:null}
      </div>
     </div>
    </article>)}</>;
}
