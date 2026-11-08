import {groupFor,menuLabel,type Navigation} from '@/lib/navigation';
export default function MenuGroupItems({data,id,locale='tr',style='header'}:{
 data:Navigation|null;id:string;locale?:string;style?:'header'|'footer'}){
 const group=groupFor(data,id);
 if(!group)return null;
 const links=group.links.filter(x=>x.enabled&&x.url&&menuLabel(x.label,locale));
 return <>{links.map(item=>style==='header'?
  <a key={item.id} className="tc-ui-link-item" href={item.url}>
   <span><span className="tc-ui-link-head"><span className="tc-ui-link-title">
    {menuLabel(item.label,locale)}
   </span></span></span>
  </a>:
  <li key={item.id}><a href={item.url} target={item.url.startsWith('https://')?'_blank':undefined}
   rel={item.url.startsWith('https://')?'noopener noreferrer':undefined}>{menuLabel(item.label,locale)}</a></li>
 )}</>;
}
