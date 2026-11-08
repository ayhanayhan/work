import {Fragment} from 'react';
import {menuLabel,menuTree,type Navigation,type MenuNode} from '@/lib/navigation';
const external=(url:string)=>url.startsWith('https://');
const isVisible=(item:MenuNode)=>item.enabled&&Boolean(menuLabel(item.label,'tr')||Object.values(item.label||{}).some(Boolean));
function TreeLink({item,locale,depth=0}:{item:MenuNode;locale:string;depth?:number}){
 if(!isVisible(item))return null;
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
 return <>{tree.header.filter(isVisible).map(node=>{
  const dropdown=node.children?.some(isVisible);
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
 return <>{tree.header.filter(x=>x.enabled&&x.children?.some(isVisible)).map(top=>
  <ul key={top.id} className={'tc-nav-children bm-add-'+(top.id==='nav-solutions'?'companies':top.id==='nav-resources'?'resources':'custom')}
   data-mega={top.id}>
   <div className="tc-mega-menu"><div className="container"><div className="tc-mega-menu-card">
    <div className="tc-ui-layout tc-ui-layout--four_columns">
     <div className="tc-ui-featured column tc-ui-featured--cta-top">
      <p className="tc-ui-overline">{top.id==='nav-solutions'?'Ticarti ile ticaret':top.id==='nav-resources'?'Ticarti kaynakları':menuLabel(top.label,locale)}</p>
      <p className="tc-ui-col-title">{top.id==='nav-solutions'?
       'İşletmenin büyüklüğüne ve satış modeline göre tek altyapıda yönetim':
       top.id==='nav-resources'?'E-ticaret operasyonlarını öğren, özellikleri keşfet ve doğru paketi seç':'Ticarti · Ticaretin yeni hali'}</p>
      <div className="tc-ui-cta"><a href={top.id==='nav-resources'?'/paketler.html#tc-compare':'/paketler.html'}>
       {top.id==='nav-resources'?'Tüm özellikleri keşfet':'Paketleri karşılaştır'}</a></div>
     </div>
     {top.children.filter(isVisible).map(column=><Fragment key={column.id}>
      <div className="tc-ui-divider"/>
      <div className="tc-ui-column column">
       <p className="tc-ui-overline">{menuLabel(column.label,locale)}</p>
       <div className="tc-ui-links">
        {column.url&&column.url!=='#'?<a className="tc-ui-link-item" href={column.url}>
         <span className="tc-ui-link-head"><span className="tc-ui-link-title">{menuLabel(column.label,locale)}</span></span>
        </a>:null}
        {column.children.filter(isVisible).map(item=><TreeLink item={item} key={item.id} locale={locale}/>)}
       </div>
      </div>
     </Fragment>)}
    </div>
   </div></div></div>
  </ul>
 )}</>;
}
function FooterNode({item,locale,depth=0}:{item:MenuNode;locale:string;depth?:number}){
 if(!isVisible(item))return null;
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
 return <>{tree.footer.filter(isVisible).map(column=><div className="footer-menu-wrap" key={column.id}>
  <div className="footer-menu-title"><h3>{menuLabel(column.label,locale)}</h3></div>
  <ul className="footer-menu-link">
   {column.children.filter(isVisible).map(item=><FooterNode item={item} locale={locale} key={item.id}/>)}
  </ul>
 </div>)}</>;
}
