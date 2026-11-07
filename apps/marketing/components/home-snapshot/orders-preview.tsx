'use client';
import {useEffect,useRef,useState} from 'react';
type Order={id:string;market:string;logo:string;items:number;price:string};
const original:Order[]=[
  {id:'TR-4821',market:'Trendyol',logo:'trendyol.svg',items:2,price:'₺1.249,90'},
  {id:'HB-3268',market:'Hepsiburada',logo:'hepsiburada.svg',items:1,price:'₺899,00'},
  {id:'N11-1954',market:'n11',logo:'n11.svg',items:3,price:'₺2.150,00'},
  {id:'PZ-7186',market:'Pazarama',logo:'pazarama.svg',items:1,price:'₺649,90'}
];
// The examples already in Ticarti's original animation script; no API or mock generator.
const upcoming:Order[]=[
  {market:'Pazarama',logo:'pazarama.svg',id:'PZ-7186',items:1,price:'₺649,90'},
  {market:'ÇiçekSepeti',logo:'ciceksepeti.svg',id:'CS-5932',items:2,price:'₺1.120,00'},
  {market:'PttAVM',logo:'epttavm.svg',id:'PT-2647',items:1,price:'₺479,90'},
  {market:'Trendyol',logo:'trendyol.svg',id:'TR-4822',items:3,price:'₺2.349,00'},
  {market:'Hepsiburada',logo:'hepsiburada.svg',id:'HB-3269',items:1,price:'₺1.099,00'},
  {market:'n11',logo:'n11.svg',id:'N11-1955',items:2,price:'₺925,50'}
];
export default function OrdersPreview(){
  const [rows,setRows]=useState(original);
  const [visible,setVisible]=useState(false);
  const [latest,setLatest]=useState('');
  const nextRef=useRef(0);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!ref.current)return;
    if(!('IntersectionObserver' in window)){setVisible(true);return;}
    const io=new IntersectionObserver(entries=>setVisible(entries.some(e=>e.isIntersecting)),{threshold:0.1});
    io.observe(ref.current);
    return()=>io.disconnect();
  },[]);
  useEffect(()=>{
    if(!visible||document.hidden||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const timer=window.setInterval(()=>{
      const next=upcoming[nextRef.current++%upcoming.length];
      setRows(rows=>[next,...rows].slice(0,4));
      setLatest(next.id);
    },2800);
    return()=>clearInterval(timer);
  },[visible]);
  return <div ref={ref} aria-label="Farklı pazaryerlerinden gelen örnek siparişler"
    aria-live="off" className="tc-orders__list" data-tc-orders-preview="">
    {rows.map((order,i)=><div key={order.id} className={'tk__row tc-order'+(i===0&&latest===order.id?' tc-order--react-enter':'')}>
      <img alt={order.market} className="tc-order__logo" src={'/assets/images/marketplaces/'+order.logo}/>
      <div className="tk__info">
        <span className="tk__role">{'Sipariş #'+order.id}</span>
        <span className="tk__meta">{order.market+' · '+order.items+' ürün '}
          <span className="tc-order__price">{order.price}</span>
        </span>
      </div>
      <span className="tk__badge">Yeni</span>
    </div>)}
  </div>;
}
