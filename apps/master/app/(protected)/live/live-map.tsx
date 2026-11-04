'use client';

import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export type LivePoint = { name:string; lat:number; lng:number; visitors:number; orders:number; sales:number };

export function LiveMap({ mode, points }: { mode:'world'|'local'; points:LivePoint[] }) {
  const local = mode === 'local';
  return <MapContainer key={mode} center={local ? [39,35] : [28,18]} zoom={local ? 6 : 2} minZoom={local ? 5 : 2} maxZoom={12} zoomControl attributionControl={false} className="h-full w-full bg-[#f5f7fa]" style={{background:'#f5f7fa'}}>
    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" subdomains="abcd" />
    {points.map((point)=><CircleMarker key={`${mode}-${point.name}`} center={[point.lat,point.lng]} radius={Math.max(7,Math.min(22,6+point.orders*.8))} pathOptions={{color:'#2563eb',fillColor:'#3b82f6',fillOpacity:.42,weight:2}}><Popup><div className="min-w-40 text-sm"><div className="font-semibold">{point.name}</div><div className="mt-1">Ziyaretçi: {point.visitors}</div><div>Sipariş: {point.orders}</div><div>Satış: ₺{point.sales.toLocaleString('tr-TR')}</div></div></Popup></CircleMarker>)}
  </MapContainer>;
}
