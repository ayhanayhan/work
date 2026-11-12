import {createHmac,timingSafeEqual} from 'crypto';

export type IyzicoWebhookPayload={
  paymentConversationId:string;
  status:string;
  token:string;
  iyziEventType:string;
  iyziPaymentId?:string|number;
};

const safeEqualHex=(a:string,b:string)=>{
  if(!/^[a-f0-9]+$/i.test(a)||!/^[a-f0-9]+$/i.test(b)||a.length!==b.length)return false;
  return timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
};

export function verifyIyzicoWebhookV3(secretKey:string,signature:string|undefined,payload:IyzicoWebhookPayload){
  const provided=String(signature||'').trim().toLowerCase();
  if(!provided)return false;
  const eventType=String(payload.iyziEventType||'');
  const paymentId=String(payload.iyziPaymentId??'');
  const token=String(payload.token||'');
  const conversationId=String(payload.paymentConversationId||'');
  const status=String(payload.status||'');
  if(!eventType||!paymentId||!token||!conversationId||!status)return false;
  const key=secretKey+eventType+paymentId+token+conversationId+status;
  const expected=createHmac('sha256',secretKey).update(key).digest('hex');
  return safeEqualHex(provided,expected);
}
