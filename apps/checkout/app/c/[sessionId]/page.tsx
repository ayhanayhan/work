import CheckoutLauncher from '../../../components/CheckoutLauncher';
export default async function CheckoutSessionPage({params}:{params:Promise<{sessionId:string}>}){const{sessionId}=await params;return <CheckoutLauncher sessionId={sessionId}/>}
