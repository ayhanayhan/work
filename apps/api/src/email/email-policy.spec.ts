import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { clean, platformSenderForSlug, safeDomain } from './email.service';
import { EmailService } from './email.service';
import { verifySns } from './sns-verifier';

test('platform sender uses the tenant slug and never reserved or malformed local parts',()=>{
 assert.equal(platformSenderForSlug('s'), 's@notify.ticarti.com');
 assert.equal(platformSenderForSlug('seuty'), 'seuty@notify.ticarti.com');
 for(const slug of ['admin','-bad','UPPER','a\r\nBcc:x','x'.repeat(64)])
  assert.equal(platformSenderForSlug(slug),'bildirim@notify.ticarti.com');
});
test('marketing identity rejects platform domain, public suffixes, IPs and free mail',()=>{
 for(const domain of ['notify.ticarti.com','foo.notify.ticarti.com','gmail.com','co.uk','127.0.0.1','foo\r\nBcc:x'])
  assert.throws(()=>safeDomain(domain));
 assert.equal(safeDomain('mail.magaza.com'),'mail.magaza.com');
});
test('email headers reject CRLF and control characters',()=>{
 assert.throws(()=>clean('Sale\r\nBcc: victim@example.com',150));
 assert.throws(()=>clean('Name\u0000Test'));
 assert.equal(clean(' Example '),'Example');
});
test('SNS feedback rejects another topic and attacker-controlled certificate URLs before fetching',async()=>{
 const topic='arn:aws:sns:eu-central-1:123456789012:mail-feedback';
 const event={Type:'Notification',TopicArn:topic,Timestamp:new Date().toISOString(),SigningCertURL:'https://attacker.invalid/evil.pem',Message:'{}',MessageId:'id',Signature:'bad',SignatureVersion:'2'};
 let fetched=false;const fetcher=async()=>{fetched=true;throw Error('Unexpected network')};
 await assert.rejects(verifySns({...event,TopicArn:'arn:aws:sns:eu-central-1:other:topic'},topic,fetcher as any));
 await assert.rejects(verifySns(event,topic,fetcher as any));
 assert.equal(fetched,false);
});
test('marketing eligibility rechecks revoked consent, suppression and current IYS status',async()=>{
 const old=process.env.EMAIL_IYS_ENFORCEMENT;process.env.EMAIL_IYS_ENFORCEMENT='required';
 let granted=true,suppressed=false,iys='OPT_IN';
 const db:any={
  emailSuppression:{findUnique:async()=>suppressed?{id:'suppression'}:null},
  emailIysConsent:{findUnique:async()=>({status:iys,checkedAt:new Date()})},
  consentRecord:{findFirst:async()=>({granted})},
 };
 const service=new EmailService(db,{} as any);
 try{
  assert.equal(await (service as any).eligible('tenant',{id:'customer',email:'alici@example.com'}),true);
  granted=false;assert.equal(await (service as any).eligible('tenant',{id:'customer',email:'alici@example.com'}),false);
  granted=true;iys='OPT_OUT';assert.equal(await (service as any).eligible('tenant',{id:'customer',email:'alici@example.com'}),false);
  iys='OPT_IN';suppressed=true;assert.equal(await (service as any).eligible('tenant',{id:'customer',email:'alici@example.com'}),false);
 }finally{if(old===undefined)delete process.env.EMAIL_IYS_ENFORCEMENT;else process.env.EMAIL_IYS_ENFORCEMENT=old;}
});
