'use client';
import {Suspense,useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import ProductCard from '../../components/ProductCard';
import {api,STORE,getCurrency,getLocale} from '../../lib/api';

function ProductList(){
  const sp=useSearchParams();const[d,setD]=useState<any>(null);const[view,setView]=useState<'grid'|'list'>('grid');const[sort,setSort]=useState('featured');const[brand,setBrand]=useState('');const[filtersOpen,setFiltersOpen]=useState(false);
  const q=sp.get('q')||'';const category=sp.get('category')||'';
  async function load(){api(`/storefront/${STORE}/products?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}&currency=${encodeURIComponent(getCurrency())}&locale=${encodeURIComponent(getLocale())}`).then(setD)}
  useEffect(()=>{void load();const h=()=>void load();window.addEventListener('currency-change',h);window.addEventListener('locale-change',h);return()=>{window.removeEventListener('currency-change',h);window.removeEventListener('locale-change',h)}},[q,category]);
  const items=useMemo(()=>{let rows=[...(d?.items||[])];if(brand)rows=rows.filter((x:any)=>String(x.brand?.slug||x.brand?.name||'')===brand);if(sort==='price-asc')rows.sort((a:any,b:any)=>Number(a.variants?.[0]?.price||0)-Number(b.variants?.[0]?.price||0));if(sort==='price-desc')rows.sort((a:any,b:any)=>Number(b.variants?.[0]?.price||0)-Number(a.variants?.[0]?.price||0));if(sort==='name')rows.sort((a:any,b:any)=>String(a.title).localeCompare(String(b.title)));return rows},[d,brand,sort]);
  const brands=useMemo(()=>Array.from(new Map((d?.items||[]).filter((x:any)=>x.brand).map((x:any)=>[String(x.brand.slug||x.brand.name),x.brand])).entries()),[d]);
  return <main className="collection-page container">
    <div className="collection-breadcrumb">Anasayfa <span>/</span> {category||q||'Ürünler'}</div>
    <div className="collection-hero"><div><span>{category?'KOLEKSİYON':'KATALOG'}</span><h1>{category?category:q?`“${q}” araması`:'Tüm Ürünler'}</h1></div><p>{d?.pagination?.total??items.length} ürün</p></div>
    <div className="collection-toolbar"><button className="collection-filter-btn" onClick={()=>setFiltersOpen(true)}>Filtreler</button><div className="collection-view"><button className={view==='grid'?'active':''} onClick={()=>setView('grid')} aria-label="Grid görünüm">▦</button><button className={view==='list'?'active':''} onClick={()=>setView('list')} aria-label="Liste görünüm">☷</button></div><select aria-label="Sıralama" value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Önerilen</option><option value="name">İsme göre</option><option value="price-asc">Fiyat: düşükten yükseğe</option><option value="price-desc">Fiyat: yüksekten düşüğe</option></select></div>
    <div className="collection-layout">
      <aside className={`collection-filters ${filtersOpen?'open':''}`}><button className="filter-close" onClick={()=>setFiltersOpen(false)}>×</button><div className="filter-block"><b>Marka</b><label><input type="radio" checked={!brand} onChange={()=>setBrand('')}/> Tümü</label>{brands.map(([key,b]:any)=><label key={key}><input type="radio" checked={brand===key} onChange={()=>setBrand(key)}/> {b.name}</label>)}</div><div className="filter-block"><b>Stok</b><label><input type="checkbox"/> Stokta olanlar</label></div><div className="filter-block"><b>Fiyat</b><div className="filter-price"><input placeholder="Min" inputMode="numeric"/><span>—</span><input placeholder="Max" inputMode="numeric"/></div></div></aside>
      <section className={`collection-products ${view==='list'?'list-view':''}`}>{items.map((p:any)=><ProductCard key={p.id} p={p} currency={d?.currency}/>)}</section>
    </div>{filtersOpen&&<button className="collection-filter-backdrop" onClick={()=>setFiltersOpen(false)} aria-label="Filtreleri kapat"/>}
  </main>
}
export default function Products(){return <Suspense fallback={<main className="container section">Ürünler yükleniyor…</main>}><ProductList/></Suspense>}
