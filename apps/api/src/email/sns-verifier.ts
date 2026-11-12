import { createVerify, X509Certificate } from 'crypto';
import { ForbiddenException } from '@nestjs/common';

const fields=(type:string)=>type==='Notification'?['Message','MessageId','Subject','Timestamp','TopicArn','Type']:
  ['Message','MessageId','SubscribeURL','Timestamp','Token','TopicArn','Type'];

export async function verifySns(input:unknown, topic:string, certificateFetcher:typeof fetch=fetch){
  const value:any=typeof input==='string'?JSON.parse(input):input;
  if(!value||!topic||value.TopicArn!==topic||!['Notification','SubscriptionConfirmation'].includes(value.Type)||!['1','2'].includes(value.SignatureVersion))throw new ForbiddenException('SNS topic or message type invalid');
  if(!Number.isFinite(Date.parse(value.Timestamp))||Math.abs(Date.now()-Date.parse(value.Timestamp))>86400000)throw new ForbiddenException('SNS timestamp invalid');
  const region=topic.split(':')[3];
  const url=new URL(value.SigningCertURL);
  if(url.protocol!=='https:'||url.port||url.username||url.password||url.hostname!==`sns.${region}.amazonaws.com`||!/^\/SimpleNotificationService-[A-Za-z0-9]+\.pem$/.test(url.pathname)||url.search||url.hash)throw new ForbiddenException('SNS certificate URL invalid');
  const certResponse=await certificateFetcher(url.toString(),{signal:AbortSignal.timeout(5000)});
  if(!certResponse.ok||Number(certResponse.headers.get('content-length')||0)>20000)throw new ForbiddenException('SNS certificate unavailable');
  const pem=await certResponse.text();if(pem.length>20000)throw new ForbiddenException('SNS certificate too large');
  const cert=new X509Certificate(pem);
  if(Date.parse(cert.validFrom)>Date.now()||Date.parse(cert.validTo)<Date.now())throw new ForbiddenException('SNS certificate expired');
  let signed='';for(const key of fields(value.Type)){
    if(key==='Subject'&&!Object.prototype.hasOwnProperty.call(value,key))continue;
    if(typeof value[key]!=='string')throw new ForbiddenException('SNS field missing');
    signed+=`${key}\n${value[key]}\n`;
  }
  const verifier=createVerify(value.SignatureVersion==='2'?'RSA-SHA256':'RSA-SHA1');verifier.update(signed,'utf8');verifier.end();
  if(!verifier.verify(cert.publicKey,Buffer.from(String(value.Signature||''),'base64')))throw new ForbiddenException('SNS signature invalid');
  return value;
}
