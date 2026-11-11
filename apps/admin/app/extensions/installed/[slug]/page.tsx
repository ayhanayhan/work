'use client';
import {useParams} from 'next/navigation';
import AdminApp from '../../../components/AdminApp';
export default function Page(){const p=useParams<{slug:string}>();return <AdminApp tab="Eklentiler" pluginPage="detail" pluginSlug={String(p?.slug||'')}/>}
