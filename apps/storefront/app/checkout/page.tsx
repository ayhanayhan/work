
import SameOriginCheckoutEntry from '../../components/checkout/SameOriginCheckoutEntry';
export default async function CheckoutPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const params=await searchParams;
  const raw=params?.session;
  const sessionId=Array.isArray(raw)?String(raw[0]||''):String(raw||'');
  return <SameOriginCheckoutEntry sessionId={sessionId.trim()||undefined}/>;
}
