'use client';

import Link from 'next/link';
import {useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {useStorefrontTheme} from '../../components/StorefrontThemeContext';

type Area='header'|'footer';

function arr(v:any){return Array.isArray(v)?v:[]}
function obj(v:any){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function str(v:any,f=''){const s=String(v??'').trim();return s||f}
function bool(v:any,f=false){return v===undefined||v===null?f:!!v}
function safeHref(v:any,f='/'){const s=str(v);if(!s)return f;if(s.startsWith('/')||s.startsWith('#')||s.startsWith('?'))return s;try{const u=new URL(s);return ['http:','https:','mailto:','tel:'].includes(u.protocol)?s:f}catch{return f}}
function stripUnsafeHtml(value:any){let html=String(value||'').slice(0,50000);html=html.replace(/<\/?(?:script|iframe|object|embed|style|svg|math|form|input|button|textarea|select|option)[^>]*>/gi,'');html=html.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'');html=html.replace(/javascript\s*:/gi,'');return html}
function groupRows(group:any){const sections=obj(group?.sections);const order=arr(group?.order).length?arr(group.order):Object.keys(sections);return order.map((id:any)=>({id:String(id),...obj(sections[String(id)])})).filter((x:any)=>x.type)}
function blockRows(section:any){const blocks=obj(section?.blocks);const order=arr(section?.block_order).length?arr(section.block_order):Object.keys(blocks);return order.map((id:any)=>({id:String(id),...obj(blocks[String(id)])})).filter((x:any)=>x.type)}

function icon(name:string){
  const common={width:20,height:20,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true};
  if(name==='search')return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>;
  if(name==='user')return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>;
  if(name==='heart')return <svg {...common}><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/></svg>;
  if(name==='cart')return <svg {...common}><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 7H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>;
  return null;
}

function HeaderGroup({boot,group}:{boot:any;group:any}){
  const router=useRouter();const[query,setQuery]=useState('');
  const rows=useMemo(()=>groupRows(group),[group]);
  const store=boot?.store||{};const menus=arr(boot?.menus);const categories=arr(boot?.categories);
  const menuItems=(handle:any)=>{const wanted=str(handle,'main-menu').toLowerCase();const menu=menus.find((m:any)=>str(m?.handle).toLowerCase()===wanted)||menus.find((m:any)=>['main','main-menu','header','primary'].includes(str(m?.handle).toLowerCase()))||menus[0];const items=arr(menu?.items);if(items.length)return items;return categories.slice(0,10).map((c:any)=>({label:c.name||c.title,href:`/products?category=${encodeURIComponent(String(c.slug||c.id||''))}`}))};
  const header=rows.find((x:any)=>String(x.type).replaceAll('_','-')==='header');
  const hs=obj(header?.settings);const menu=menuItems(hs.menu);const logoUrl=str(hs.logo||hs.logo_svg||store.logoUrl||store.logo);const logoText=str(store.name,'Ticarti');const width=Math.max(70,Math.min(320,Number(hs.logo_max_width||140)));
  const sticky=String(hs.enable__sticky_header||'').includes('desktop')||String(hs.enable__sticky_header||'').includes('mobile');
  return <>
    {rows.filter((x:any)=>String(x.type).replaceAll('_','-')==='promo-header').map((row:any)=>{const s=obj(row.settings);return <div key={row.id} data-design-target={`header:${row.id}`} data-design-label="Promo Header" style={{background:str(s.color_background,'#f7f7f7'),color:str(s.color_base,'inherit'),padding:`${Math.max(0,Number(s.v_padding||10))}px 16px`,textAlign:'center',fontSize:13}} dangerouslySetInnerHTML={{__html:stripUnsafeHtml(s.block_text||'')}}/>})}
    {header&&<header data-design-target={`header:${header.id}`} data-design-label={str(header.name,'Header')} style={{position:sticky?'sticky':'relative',top:0,zIndex:50,background:str(hs.color_background,'#fff'),borderBottom:hs.show_bottom_line?'1px solid #e6e6e6':'1px solid rgba(0,0,0,.06)'}}>
      <div style={{maxWidth:'var(--page-width, 1400px)',margin:'0 auto',minHeight:76,padding:'12px 20px',display:'grid',gridTemplateColumns:'auto 1fr auto',alignItems:'center',gap:24}}>
        <Link href="/" style={{display:'inline-flex',alignItems:'center',color:'inherit',textDecoration:'none',fontWeight:700,fontSize:22}}>{logoUrl?<img src={logoUrl} alt={logoText} style={{display:'block',maxWidth:width,maxHeight:54,width:'auto',height:'auto'}}/>:logoText}</Link>
        <nav style={{display:'flex',justifyContent:hs.classic_menu_position==='top-menu-to-left'?'flex-start':hs.classic_menu_position==='top-menu-to-right'?'flex-end':'center',gap:24,alignItems:'center',flexWrap:'wrap'}}>{menu.slice(0,10).map((item:any,i:number)=><Link key={`${item.label||item.title}-${i}`} href={safeHref(item.href||item.url||item.link,'/')} style={{color:str(hs.color_menu_item,'inherit'),textDecoration:'none',fontSize:14,fontWeight:hs.menu_font_weight==='strong'?600:400}}>{item.label||item.title||'Menü'}</Link>)}</nav>
        <div style={{display:'flex',alignItems:'center',gap:12,color:str(hs.color_icons,'inherit')}}>
          {hs.show_search!==false&&<form onSubmit={e=>{e.preventDefault();const q=query.trim();if(q)router.push(`/products?q=${encodeURIComponent(q)}`)}} style={{display:hs.show_search==='opened'?'flex':'none',alignItems:'center',gap:6,border:'1px solid rgba(0,0,0,.12)',borderRadius:999,padding:'7px 10px'}}>{icon('search')}<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ara" style={{border:0,outline:0,background:'transparent',width:140,font:'inherit'}}/></form>}
          <Link href="/login" aria-label="Hesabım" style={{color:'inherit'}}>{icon('user')}</Link><Link href="/wishlist" aria-label="Favoriler" style={{color:'inherit'}}>{icon('heart')}</Link><Link href="/cart" aria-label="Sepet" style={{color:'inherit'}}>{icon('cart')}</Link>
        </div>
      </div>
    </header>}
  </>;
}

function FooterGroup({boot,group}:{boot:any;group:any}){
  const rows=useMemo(()=>groupRows(group),[group]);const menus=arr(boot?.menus);const store=boot?.store||{};
  const menuItems=(handle:any)=>{const wanted=str(handle).toLowerCase();const menu=menus.find((m:any)=>str(m?.handle).toLowerCase()===wanted);return arr(menu?.items)};
  return <footer data-theme-area="footer">
    {rows.map((row:any)=>{const type=String(row.type).replaceAll('_','-');const s=obj(row.settings);
      if(type==='newsletter-signup')return <section key={row.id} data-design-target={`footer:${row.id}`} data-design-label={str(row.name,'Newsletter')} style={{background:str(s.color_background,'transparent'),padding:'48px 20px',textAlign:s.heading_aligment==='text-left'?'left':s.heading_aligment==='text-right'?'right':'center',borderTop:s.show_lines?'1px solid rgba(0,0,0,.1)':'none'}}><div style={{maxWidth:760,margin:'0 auto'}}>{s.main_subheading&&<div style={{fontSize:13,textTransform:'uppercase',letterSpacing:1.2,opacity:.65}}>{String(s.main_subheading)}</div>}{s.main_heading&&<h2 style={{margin:'8px 0 10px',fontSize:'clamp(26px,3vw,42px)'}}>{String(s.main_heading)}</h2>}{s.main_desc&&<div dangerouslySetInnerHTML={{__html:stripUnsafeHtml(s.main_desc)}}/>}{bool(s.show_newsletter,true)&&<form onSubmit={e=>e.preventDefault()} style={{display:'flex',maxWidth:560,margin:'24px auto 0',border:'1px solid rgba(0,0,0,.15)',borderRadius:999,overflow:'hidden',background:str(s.color_input_background,'#fff')}}><input type="email" placeholder="E-posta adresiniz" style={{flex:1,minWidth:0,border:0,outline:0,padding:'13px 18px',font:'inherit',background:'transparent'}}/><button type="submit" style={{border:0,padding:'0 20px',background:'#111',color:'#fff',fontWeight:600}}>Katıl</button></form>}{s.desc2&&<div style={{marginTop:12,fontSize:12,opacity:.65}} dangerouslySetInnerHTML={{__html:stripUnsafeHtml(s.desc2)}}/>}</div></section>;
      if(type==='footer'){const blocks=blockRows(row);return <section key={row.id} data-design-target={`footer:${row.id}`} data-design-label={str(row.name,'Footer')} style={{background:str(s.color_background,'#fff'),borderTop:s.show_lines?'1px solid rgba(0,0,0,.1)':'none',padding:'48px 20px 28px'}}><div style={{maxWidth:'var(--page-width, 1400px)',margin:'0 auto'}}><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:32}}>{blocks.map((b:any)=>{const bs=obj(b.settings);if(b.type==='link_list'){const items=menuItems(bs.menu);return <div key={b.id}><h3 style={{fontSize:15,margin:'0 0 14px'}}>{str(bs.heading||bs.title,'Menü')}</h3><div style={{display:'grid',gap:9}}>{items.map((it:any,i:number)=><Link key={i} href={safeHref(it.href||it.url||it.link,'/')} style={{color:'inherit',textDecoration:'none',opacity:.72,fontSize:14}}>{it.label||it.title}</Link>)}</div></div>}if(b.type==='media_with_text'){return <div key={b.id}>{bs.heading&&<h3 style={{fontSize:15,margin:'0 0 14px'}}>{String(bs.heading)}</h3>}{bs.text&&<div style={{fontSize:14,opacity:.72,lineHeight:1.7}} dangerouslySetInnerHTML={{__html:stripUnsafeHtml(bs.text)}}/>}</div>}return null})}</div><div style={{marginTop:38,paddingTop:20,borderTop:'1px solid rgba(0,0,0,.08)',fontSize:12,opacity:.62}}>© {new Date().getFullYear()} {store.name||'Ticarti'}</div></div></section>}
      return null})}
  </footer>;
}

export default function ThemeGroupRenderer({type,boot}:{type:Area;boot:any}){
  const state=useStorefrontTheme();const group=state.runtime?.groups?.[type];
  if(!group)return null;
  return type==='header'?<HeaderGroup boot={boot} group={group}/>:<FooterGroup boot={boot} group={group}/>;
}
