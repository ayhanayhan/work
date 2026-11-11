'use client';
import {useParams} from 'next/navigation';
import AdminApp from '../../../components/AdminApp';
export default function ExtensionPreviewPage(){
 const params=useParams<{slug:string}>();
 return <AdminApp tab="Eklentiler" pluginPage="preview" pluginSlug={String(params?.slug||'')}/>;
}
