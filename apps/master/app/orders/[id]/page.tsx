import AdminApp from '../../components/AdminApp';
export const metadata={title:'Sipariş Detayı | Commerce OS'};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <AdminApp tab="Siparişler" orderId={id}/>}
