'use client';
import { useParams } from 'next/navigation';
import AdminApp from '../../../components/AdminApp';
export default function Page(){const params=useParams();const raw=params?.slug;const slug=Array.isArray(raw)?raw[0]:String(raw||'');return <AdminApp tab="Eklentiler" pluginPage="detail" pluginSlug={slug}/>}
