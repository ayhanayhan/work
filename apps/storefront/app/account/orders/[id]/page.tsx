import CustomerOrderDetail from '../../../../components/CustomerOrderDetail';
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <CustomerOrderDetail orderId={id}/>}
