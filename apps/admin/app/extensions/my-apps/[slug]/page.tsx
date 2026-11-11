'use client';
import {useParams} from 'next/navigation';
import AdminApp from '../../../components/AdminApp';
export default function Page(){
 const params=useParams<{slug:string}>();
 const slug=String(params?.slug||'');
 return <AdminApp tab="Eklentiler" pluginPage="detail" pluginSlug={slug}/>;
}
