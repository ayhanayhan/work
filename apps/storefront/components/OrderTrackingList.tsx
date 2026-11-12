'use client';
import Link from 'next/link';
import {sfText,currentStorefrontLocale} from '../lib/i18n';

type OrderTrackingListProps={orders?:any[];token?:string;shipments?:any[]};
export default function OrderTrackingList({orders=[],shipments=[]}:OrderTrackingListProps){
 const directShipments=Array.isArray(shipments)?shipments:[];const orderRows=Array.isArray(orders)?orders:[];
 if(!orderRows.length&&!directShipments.length)return <p>{sfText('deep.final2.146')}</p>;
 const Shipment=({s}:{s:any})=><div style={{marginTop:8}}><b>{s?.carrierName||s?.provider||'Kargo'}</b>{(s?.trackingCode||s?.trackingNumber)&&<div>Takip: {s.trackingUrl?<a href={s.trackingUrl} target="_blank" rel="noreferrer">{s.trackingCode||s.trackingNumber}</a>:(s.trackingCode||s.trackingNumber)}</div>}{s?.status&&<small>{s.status}</small>}</div>;
 if(orderRows.length)return <div className="order-tracking-list">{orderRows.map((order:any)=><div className="account-order" key={order?.id||order?.number} style={{padding:'14px 0',borderBottom:'1px solid #eee'}}><div style={{display:'flex',gap:12,justifyContent:'space-between',flexWrap:'wrap'}}><Link href={`/account/orders/${order.id}`}><b>#{order?.number||order?.id||sfText('common.order',currentStorefrontLocale())}</b></Link>{order?.status&&<span>{order.status}</span>}</div>{order?.createdAt&&<div className="muted" style={{marginTop:4}}>{new Date(order.createdAt).toLocaleDateString()}</div>}{(order?.shipments||[]).map((s:any)=><Shipment key={s?.id||s?.trackingCode||s?.trackingNumber} s={s}/>)}<div style={{marginTop:10,display:'flex',gap:8,flexWrap:'wrap'}}><Link className="btn btn--border" href={`/account/orders/${order.id}`}>Sipariş detayını gör</Link>{order?.fulfillmentStatus==='FULFILLED'&&!['CANCELLED','REFUNDED'].includes(String(order?.status||''))&&<Link className="btn" href={`/account/orders/${order.id}#return-request`}>İade Et</Link>}</div></div>)}</div>;
 return <div className="order-tracking-list">{directShipments.map((s:any)=><Shipment key={s?.id||s?.trackingCode||s?.trackingNumber} s={s}/>)}</div>;
}
