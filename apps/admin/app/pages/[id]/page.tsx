import AdminApp from '../../components/AdminApp';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <AdminApp tab="Sayfalar" pageEditorId={id}/>}
