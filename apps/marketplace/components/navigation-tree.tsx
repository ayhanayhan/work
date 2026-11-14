import {Fragment} from 'react';
import {menuLabel,menuTree,type Navigation,type MenuNode} from '../lib/navigation';
const external=(url:string)=>url.startsWith('https://');
const isVisible=(item:MenuNode,locale:string)=>item.enabled&&Boolean(menuLabel(item.label,locale));
function TreeLink({item,locale,depth=0}:{item:MenuNode;locale:string;depth?:number}){
 if(!isVisible(item,locale))return null;
 const title=menuLabel(item.label,locale),href=item.url&&item.url!=='#'?item.url:item.children.length?'#':undefined;
 return <div className={depth?'tc-ui-tree-branch':'tc-ui-tree-root'}>
  {href?<a className="tc-ui-link-item" href={href} target={external(href)?'_blank':undefined}
    rel={external(href)?'noopener noreferrer':undefined}>
   <span><span className="tc-ui-link-head"><span className="tc-ui-link-title">{title}</span></span></span>
  </a>:<span className="tc-ui-link-item tc-ui-link-heading"><span className="tc-ui-link-title">{title}</span></span>}
  {item.children?.length?<div className="tc-ui-tree-children" role="group">
   {item.children.map(child=><TreeLink item={child} locale={locale} depth={depth+1} key={child.id}/>)}
  </div>:null}
 </div>;
}
export function HeaderPrimaryTree({navigation,locale='tr'}:{navigation:Navigation|null;locale?:string}){
 const tree=menuTree(navigation);
 return <>{tree.header.filter(item=>isVisible(item,locale)).map(node=>{
  const dropdown=node.children?.some(item=>isVisible(item,locale));
  const href=node.url||'#';
  return <li className="tc-nav-item tc-nav-primary" role="none" key={node.id}>
    <a role="menuitem" href={href} className={dropdown?'has-mega':undefined}
      data-mega-slug={dropdown?node.id:undefined}
      aria-haspopup={dropdown?'true':undefined} aria-expanded={dropdown?'false':undefined}>
      {menuLabel(node.label,locale)}
    </a>
  </li>;
 })}</>;
}
export function HeaderMegaTree({navigation,locale='tr',mobile=false}:{navigation:Navigation|null;locale?:string;mobile?:boolean}){
 const tree=menuTree(navigation);
 return <>{tree.header.filter(x=>isVisible(x,locale)&&x.children?.some(item=>isVisible(item,locale))).map(top=>
  <ul key={top.id} className={'tc-nav-children bm-add-'+(top.id==='nav-solutions'?'companies':top.id==='nav-resources'?'resources':'custom')}
   data-mega={top.id} data-mobile-panel={mobile?'true':undefined}>
   <div className="tc-mega-menu"><div className="container"><div className="tc-mega-menu-card">
    <div className="tc-ui-layout tc-ui-layout--four_columns">
     {top.featured&&(
      menuLabel(top.featured.eyebrow,locale)||menuLabel(top.featured.description,locale)||
      menuLabel(top.featured.buttonLabel,locale))?
      <div className="tc-ui-featured column tc-ui-featured--cta-top">
       {menuLabel(top.featured.eyebrow,locale)?<p className="tc-ui-overline">{menuLabel(top.featured.eyebrow,locale)}</p>:null}
       {menuLabel(top.featured.description,locale)?<p className="tc-ui-col-title">{menuLabel(top.featured.description,locale)}</p>:null}
       {menuLabel(top.featured.buttonLabel,locale)&&top.featured.buttonUrl?
        <div className="tc-ui-cta"><a href={top.featured.buttonUrl}>{menuLabel(top.featured.buttonLabel,locale)}</a></div>:null}
      </div>:null}
     {top.children.filter(item=>isVisible(item,locale)).map(column=><Fragment key={column.id}>
      <div className="tc-ui-divider"/>
      <div className="tc-ui-column column">
       <p className="tc-ui-overline">{menuLabel(column.label,locale)}</p>
       <div className="tc-ui-links">
        {column.url&&column.url!=='#'?<a className="tc-ui-link-item" href={column.url}>
         <span className="tc-ui-link-head"><span className="tc-ui-link-title">{menuLabel(column.label,locale)}</span></span>
        </a>:null}
        {column.children.filter(item=>isVisible(item,locale)).map(item=><TreeLink item={item} key={item.id} locale={locale}/>)}
       </div>
      </div>
     </Fragment>)}
    </div>
   </div></div></div>
  </ul>
 )}</>;
}
function FooterNode({item,locale,depth=0}:{item:MenuNode;locale:string;depth?:number}){
 if(!isVisible(item,locale))return null;
 const href=item.url&&item.url!=='#'?item.url:undefined;
 return <li>
  {href?<a href={href} target={external(href)?'_blank':undefined}
    rel={external(href)?'noopener noreferrer':undefined}>{menuLabel(item.label,locale)}</a>:
    <span className="tc-footer-tree-heading">{menuLabel(item.label,locale)}</span>}
  {item.children?.length?<ul className="tc-footer-tree-children">
   {item.children.map(child=><FooterNode key={child.id} item={child} locale={locale} depth={depth+1}/>)}
  </ul>:null}
 </li>;
}
export function FooterTree({navigation,locale='tr'}:{navigation:Navigation|null;locale?:string}){
 const tree=menuTree(navigation);
 return <>{tree.footer.filter(item=>isVisible(item,locale)).map(column=><div className="footer-menu-wrap" key={column.id}>
  <div className="footer-menu-title"><h3>{menuLabel(column.label,locale)}</h3></div>
  <ul className="footer-menu-link">
   {column.children.filter(item=>isVisible(item,locale)).map(item=><FooterNode item={item} locale={locale} key={item.id}/>)}
  </ul>
 </div>)}</>;
}
