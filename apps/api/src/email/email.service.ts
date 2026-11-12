import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { resolveTxt } from 'dns/promises';
import { domainToASCII } from 'url';
import { getDomain } from 'tldts';
import { isIP } from 'net';
import { SESv2Client, CreateEmailIdentityCommand, GetEmailIdentityCommand, PutEmailIdentityMailFromAttributesCommand, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { PrismaService } from '../prisma/prisma.service';
import { AppBillingService } from '../app-billing/app-billing.service';
import { verifySns } from './sns-verifier';

const PLATFORM_DOMAIN = 'notify.ticarti.com';
const reserved = new Set('admin info destek finans hesap siparis bildirim security abuse postmaster webmaster noreply no-reply bounce mail email system sistem ticarti root'.split(' '));
const slugPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const localPattern = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
const emailPattern = /^[^\s@\x00-\x1f\x7f]+@[^\s@\x00-\x1f\x7f]+\.[a-z]{2,}$/i;
const escape = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c));
export const clean = (v: unknown, max = 200) => { const s = String(v ?? '').trim(); if (s.length > max || /[\r\n\x00-\x1f\x7f]/.test(s)) throw new BadRequestException('Invalid mail field'); return s; };
const hash = (s: string) => createHash('sha256').update(s.trim().toLowerCase()).digest('hex');
const safeAddress = (s: unknown) => { const v=clean(s,254).toLowerCase(); if (!emailPattern.test(v)) throw new BadRequestException('Invalid email address'); return v; };
const safeLocal = (s: unknown) => { const v=clean(s,64).toLowerCase(); if (!localPattern.test(v)) throw new BadRequestException('Invalid sender address'); return v; };
export const safeDomain = (s: unknown) => {
  const raw=clean(s,253).toLowerCase(); const v=domainToASCII(raw);
  if (!v || isIP(v) || !getDomain(v) || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(v) || v.split('.').some(x=>x.length>63 || x.startsWith('-') || x.endsWith('-')) ||
    /^(gmail|outlook|hotmail|yahoo)\.com$/.test(v) || v===PLATFORM_DOMAIN || v.endsWith('.'+PLATFORM_DOMAIN)) throw new BadRequestException('Invalid mail domain');
  return v;
};
const dateKey = () => new Date().toISOString().slice(0,7);
export const platformSenderForSlug = (slug:string) => `${slugPattern.test(slug)&&!reserved.has(slug)?slug:'bildirim'}@${PLATFORM_DOMAIN}`;

@Injectable()
export class EmailService {
  private txClient?: SESv2Client;
  private mktClient?: SESv2Client;
  constructor(private readonly db: PrismaService,private readonly appBilling:AppBillingService) {}

  private ses(scope: 'TX'|'MKT', provisioner=false) {
    const prefix=`AWS_SES_${scope}_`;
    const id=process.env[prefix+(provisioner?'PROVISIONER_ACCESS_KEY_ID':'ACCESS_KEY_ID')];
    const secret=process.env[prefix+(provisioner?'PROVISIONER_SECRET_ACCESS_KEY':'SECRET_ACCESS_KEY')];
    const region=process.env[prefix+'REGION'];
    if (!id || !secret || !region) throw new ServiceUnavailableException('Mail provider is not configured');
    if (provisioner) return new SESv2Client({region,credentials:{accessKeyId:id,secretAccessKey:secret}});
    if (scope==='TX') return this.txClient ||= new SESv2Client({region,credentials:{accessKeyId:id,secretAccessKey:secret}});
    return this.mktClient ||= new SESv2Client({region,credentials:{accessKeyId:id,secretAccessKey:secret}});
  }
  private async policy() { return this.db.emailPlatformPolicy.findUnique({where:{id:'default'}}); }
  async sendTransactional(input:{tenantId?:string,to:string,subject:string,text:string,html?:string,replyTo?:string|null}) {
    if((await this.policy())?.transactionalEnabled===false)throw new ServiceUnavailableException('Transactional sending is disabled');
    const to=safeAddress(input.to),subject=clean(input.subject,150),body=String(input.text||''),html=String(input.html||'');
    if(await this.db.emailGlobalSuppression.findUnique({where:{emailHash:hash(to)}}))throw new ServiceUnavailableException('Recipient suppressed after permanent delivery failure');
    if(!subject||!body||body.length>20000)throw new BadRequestException('Invalid transactional content');
    let from=`bildirim@${PLATFORM_DOMAIN}`;
    if(input.tenantId){
      const tenant=await this.db.tenant.findUnique({where:{id:input.tenantId},select:{slug:true}});
      if(!tenant)throw new NotFoundException();
      from=platformSenderForSlug(tenant.slug);
      const settings=await this.db.tenantEmailSettings.findUnique({where:{tenantId:input.tenantId}});
      if(settings?.senderMode==='CUSTOM_DOMAIN'&&settings.customDomainId){
        const domain=await this.db.tenantEmailDomain.findFirst({where:{id:settings.customDomainId,tenantId:input.tenantId,status:'VERIFIED',txVerified:true,purpose:'TRANSACTIONAL'}});
        if(domain){const current=await this.checkDomain(input.tenantId,domain.id).catch(()=>null);if(current?.txVerified)from=`${settings.senderLocal}@${domain.domain}`;}
      }
    }
    const sesCfg=await this.sesConfiguration();
    if(!sesCfg.txConfigurationSet||!sesCfg.txSnsTopicArn)throw new ServiceUnavailableException('Transactional SES feedback configuration missing');
    const replyTo=input.replyTo&&emailPattern.test(String(input.replyTo).trim())?[safeAddress(input.replyTo)]:undefined;
    const result=await new SESv2Client({region:sesCfg.txRegion,credentials:{accessKeyId:String(process.env.AWS_SES_TX_ACCESS_KEY_ID),secretAccessKey:String(process.env.AWS_SES_TX_SECRET_ACCESS_KEY)}}).send(new SendEmailCommand({FromEmailAddress:from,Destination:{ToAddresses:[to]},...(replyTo?{ReplyToAddresses:replyTo}:{}),Content:{Simple:{Subject:{Data:subject,Charset:'UTF-8'},Body:{Text:{Data:body,Charset:'UTF-8'},...(html?{Html:{Data:html,Charset:'UTF-8'}}:{})}}},ConfigurationSetName:sesCfg.txConfigurationSet}));
    if(result.MessageId)await this.db.emailTransactionalMessage.create({data:{tenantId:input.tenantId||null,emailHash:hash(to),providerId:result.MessageId}}).catch(()=>{
      console.error('[transactional-email] SES accepted but local delivery log failed; reconcile provider message ID from AWS logs');
    });
    return {accepted:!!result.MessageId,providerId:result.MessageId||null};
  }

  private templateReplace(value:unknown,vars:Record<string,string>){return String(value??'').replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi,(_m,key)=>vars[String(key).toLowerCase()]??'');}
  private safeTemplateHtml(value:unknown){let html=String(value||'').slice(0,120000);html=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|iframe|object|embed|form|input|button|textarea|select|option|base|link|meta)\b[\s\S]*?<\/\1\s*>/gi,'').replace(/<(script|iframe|object|embed|form|input|button|textarea|select|option|base|link|meta)\b[^>]*\/?>/gi,'');return html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/\s(src|href)\s*=\s*(["'])\s*(javascript:|data:text\/html)[\s\S]*?\2/gi,' $1="#"');}
  private emailStoreUrl(store:any){return store?.domain?`https://${store.domain}`:`https://${store.publicSlug}.ticarti.com`;}
  private templateMoney(value:any,currency:string,locale:string){try{return new Intl.NumberFormat(locale||'tr-TR',{style:'currency',currency:String(currency||'TRY').toUpperCase()}).format(Number(value||0));}catch{return `${Number(value||0).toFixed(2)} ${String(currency||'TRY').toUpperCase()}`}}
  private defaultLegalFooterHtml(locale:string){
    const code=String(locale||'tr').toLowerCase().split(/[-_]/)[0];
    if(code==='en')return '<p>If you prefer not to receive campaign and promotional emails from <strong>{{store_name}}</strong>, please <a href="{{unsubscribe_url}}">unsubscribe here</a>.</p><p>This email was sent to <a href="mailto:{{recipient_email}}">{{recipient_email}}</a> because this address is registered in the lawful communication database of <strong>{{store_name}}</strong>. To help our emails reach your inbox, you may add <a href="mailto:{{sender_email}}">{{sender_email}}</a> to your address book.</p><p>For questions, you can contact us at {{support_phone}} or <a href="mailto:{{support_email}}">{{support_email}}</a>. We respect your privacy and do not share your personal information except where required to provide our services or by law. You can review our <a href="{{privacy_url}}">Privacy Policy</a>.</p><p><strong>{{company_name}}</strong>{{store_address}}<br>{{mersis_label}}{{mersis_no}} · © {{year}}</p>';
    if(code==='pt')return '<p>Se não quiser receber campanhas e comunicações promocionais da <strong>{{store_name}}</strong>, <a href="{{unsubscribe_url}}">clique aqui para cancelar a subscrição</a>.</p><p>Este e-mail foi enviado para <a href="mailto:{{recipient_email}}">{{recipient_email}}</a> porque este endereço está registado na base de comunicações autorizadas da <strong>{{store_name}}</strong>. Para receber as nossas mensagens corretamente, pode adicionar <a href="mailto:{{sender_email}}">{{sender_email}}</a> aos seus contactos.</p><p>Para dúvidas, contacte-nos através de {{support_phone}} ou <a href="mailto:{{support_email}}">{{support_email}}</a>. Respeitamos a sua privacidade e não partilhamos os seus dados pessoais, exceto quando necessário para prestar os nossos serviços ou por obrigação legal. Consulte a nossa <a href="{{privacy_url}}">Política de Privacidade</a>.</p><p><strong>{{company_name}}</strong>{{store_address}}<br>{{mersis_label}}{{mersis_no}} · © {{year}}</p>';
    if(code==='ru')return '<p>Если вы не хотите получать рекламные и информационные письма от <strong>{{store_name}}</strong>, <a href="{{unsubscribe_url}}">отпишитесь здесь</a>.</p><p>Это письмо отправлено на адрес <a href="mailto:{{recipient_email}}">{{recipient_email}}</a>, поскольку он зарегистрирован в законной базе коммуникаций <strong>{{store_name}}</strong>. Чтобы наши письма корректно попадали во входящие, добавьте <a href="mailto:{{sender_email}}">{{sender_email}}</a> в адресную книгу.</p><p>По вопросам свяжитесь с нами: {{support_phone}} или <a href="mailto:{{support_email}}">{{support_email}}</a>. Мы уважаем вашу конфиденциальность и не передаём персональные данные, кроме случаев, необходимых для оказания услуг или предусмотренных законом. Ознакомьтесь с нашей <a href="{{privacy_url}}">Политикой конфиденциальности</a>.</p><p><strong>{{company_name}}</strong>{{store_address}}<br>{{mersis_label}}{{mersis_no}} · © {{year}}</p>';
    return '<p><strong>{{store_name}}</strong> kampanya ve tanıtım e-postalarından haberdar olmayı tercih etmiyorsanız <a href="{{unsubscribe_url}}">buraya tıklayarak pazarlama e-postalarından ayrılabilirsiniz</a>.</p><p>Bu e-posta, <a href="mailto:{{recipient_email}}">{{recipient_email}}</a> adresi <strong>{{store_name}}</strong> yasal iletişim veritabanında kayıtlı olduğu için gönderilmiştir. Gönderimlerimizin e-posta kutunuza sorunsuz ulaşması için <a href="mailto:{{sender_email}}">{{sender_email}}</a> adresini adres defterinize ekleyebilirsiniz.</p><p>Sorularınız için {{support_phone}} veya <a href="mailto:{{support_email}}">{{support_email}}</a> üzerinden bize ulaşabilirsiniz. Gizliliğinize önem veriyoruz; kişisel bilgilerinizi hizmetin sunulması veya yasal zorunluluklar dışında paylaşmayız. <a href="{{privacy_url}}">Gizlilik Politikamızı</a> inceleyebilirsiniz.</p><p><strong>{{company_name}}</strong>{{store_address}}<br>{{mersis_label}}{{mersis_no}} · © {{year}}</p>';
  }
  private async templateProducts(tenantId:string,block:any){
    const c=block?.content&&typeof block.content==='object'?block.content:{};
    const source=String(c.source||'BEST_SELLERS').toUpperCase();
    const take=Math.max(1,Math.min(8,Number(c.limit||4)));
    let ids:string[]=[];
    if(source==='MANUAL') ids=(Array.isArray(c.productIds)?c.productIds:[]).map(String).filter(Boolean).slice(0,take);
    else if(source==='CATEGORY'&&c.categoryId){
      const links=await this.db.productCategory.findMany({where:{categoryId:String(c.categoryId),product:{storeId:tenantId,status:'ACTIVE'}},select:{productId:true},take});
      ids=links.map(x=>x.productId);
    } else if(source==='LATEST') {
      ids=(await this.db.product.findMany({where:{storeId:tenantId,status:'ACTIVE'},select:{id:true},orderBy:[{publishedAt:'desc'},{createdAt:'desc'}],take})).map(x=>x.id);
    } else if(source==='RANDOM') {
      ids=(await this.db.product.findMany({where:{storeId:tenantId,status:'ACTIVE'},select:{id:true},orderBy:{createdAt:'desc'},take:Math.max(16,take*3)})).sort(()=>Math.random()-0.5).slice(0,take).map(x=>x.id);
    } else {
      const items=await this.db.orderItem.findMany({where:{productIdSnapshot:{not:null},order:{storeId:tenantId,paymentStatus:{in:['PAID','PARTIALLY_REFUNDED']}}},select:{productIdSnapshot:true,quantity:true},take:1200});
      const totals=new Map<string,number>();
      for(const item of items){
        const id=String(item.productIdSnapshot||'');
        if(id) totals.set(id,(totals.get(id)||0)+Number(item.quantity||0));
      }
      ids=[...totals.entries()].sort((a,b)=>b[1]-a[1]).slice(0,take).map(x=>x[0]);
      if(!ids.length) ids=(await this.db.product.findMany({where:{storeId:tenantId,status:'ACTIVE'},select:{id:true},orderBy:[{publishedAt:'desc'},{createdAt:'desc'}],take})).map(x=>x.id);
    }
    if(!ids.length) return [];
    const rows=await this.db.product.findMany({
      where:{storeId:tenantId,status:'ACTIVE',id:{in:ids}},
      select:{
        id:true,
        title:true,
        slug:true,
        images:{select:{url:true,alt:true},orderBy:{sortOrder:'asc'},take:1},
        variants:{where:{isActive:true},select:{price:true,comparePrice:true},orderBy:{price:'asc'},take:1},
        categories:{take:1,select:{category:{select:{id:true,name:true,slug:true}}}},
      },
    });
    const by=new Map(rows.map(x=>[x.id,x]));
    return ids.map(id=>by.get(id)).filter(Boolean);
  }
  private async templateMenuItems(tenantId:string,block:any,locale:string,storeUrl:string){
    const c=block?.content&&typeof block.content==='object'?block.content:{};
    const configured=Array.isArray(c.items)?c.items.slice(0,20):[];
    if(configured.length){
      const categoryIds=configured.filter((x:any)=>String(x?.type).toUpperCase()==='CATEGORY'&&x?.refId).map((x:any)=>String(x.refId));
      const pageIds=configured.filter((x:any)=>String(x?.type).toUpperCase()==='PAGE'&&x?.refId).map((x:any)=>String(x.refId));
      const [categories,pages]=await Promise.all([
        categoryIds.length?this.db.category.findMany({where:{storeId:tenantId,isActive:true,id:{in:categoryIds}},select:{id:true,name:true,slug:true}}):Promise.resolve([]),
        pageIds.length?this.db.page.findMany({where:{storeId:tenantId,status:'PUBLISHED',id:{in:pageIds}},select:{id:true,title:true,slug:true}}):Promise.resolve([]),
      ]);
      const ids=[...categoryIds,...pageIds];
      const code=String(locale||'').toLowerCase().split(/[-_]/)[0];
      const trs=ids.length?await this.db.contentTranslation.findMany({where:{storeId:tenantId,entityId:{in:ids},locale:{in:[locale,code]}},select:{entityType:true,entityId:true,locale:true,fields:true}}).catch(()=>[]):[];
      const translated=(entityType:string,id:string,base:{label:string;slug:string})=>{const row:any=trs.find((x:any)=>x.entityType===entityType&&x.entityId===id&&String(x.locale).toLowerCase()===String(locale).toLowerCase())||trs.find((x:any)=>x.entityType===entityType&&x.entityId===id&&String(x.locale).toLowerCase().split(/[-_]/)[0]===code);const f:any=row?.fields||{};return{label:String(f.name||f.title||base.label),slug:String(f.slug||base.slug)}};
      const byCategory=new Map(categories.map((x:any)=>[x.id,x]));
      const byPage=new Map(pages.map((x:any)=>[x.id,x]));
      const out:any[]=[];
      for(const raw of configured){
        const type=String(raw?.type||'CUSTOM').toUpperCase();
        if(type==='CATEGORY'){
          const x:any=byCategory.get(String(raw.refId)); if(!x)continue;
          const tr=translated('category',x.id,{label:String(raw.label||x.name),slug:x.slug});out.push({label:String(raw.label||tr.label),url:`${storeUrl}/category/${encodeURIComponent(tr.slug)}`});continue;
        }
        if(type==='PAGE'){
          const x:any=byPage.get(String(raw.refId)); if(!x)continue;
          const tr=translated('page',x.id,{label:String(raw.label||x.title),slug:x.slug});out.push({label:String(raw.label||tr.label),url:`${storeUrl}/pages/${encodeURIComponent(tr.slug)}`});continue;
        }
        const label=clean(raw?.label||'',80);const url=String(raw?.url||'').trim();if(!label||!url)continue;
        if(url.startsWith('/')) out.push({label,url:`${storeUrl}${url}`});
        else {try{const u=new URL(url);if(u.protocol==='https:'&&!u.username&&!u.password)out.push({label,url:u.toString()});}catch{}}
      }
      return out;
    }
    // Backward compatibility for previously saved automatic menu blocks.
    const source=String(c.source||'MIXED').toUpperCase();
    const categoryLimit=Math.max(1,Math.min(12,Number(c.categoryLimit)||4));
    const pageLimit=Math.max(1,Math.min(12,Number(c.pageLimit)||4));
    const categories=source==='PAGES'?[]:await this.db.category.findMany({where:{storeId:tenantId,isActive:true},select:{id:true,name:true,slug:true},orderBy:[{sortOrder:'asc'},{name:'asc'}],take:categoryLimit});
    const pages=source==='CATEGORIES'?[]:await this.db.page.findMany({where:{storeId:tenantId,status:'PUBLISHED'},select:{id:true,title:true,slug:true},orderBy:{updatedAt:'desc'},take:pageLimit});
    return [...categories.map((x:any)=>({label:x.name,url:`${storeUrl}/category/${encodeURIComponent(x.slug)}`})),...pages.map((x:any)=>({label:x.title,url:`${storeUrl}/pages/${encodeURIComponent(x.slug)}`}))];
  }
  private async renderTemplate(tenantId:string,template:any,event:string,locale:string,context:any={}){
    const store:any=await this.db.tenant.findUnique({where:{id:tenantId},select:{id:true,name:true,slug:true,domain:true,publicSlug:true,logoUrl:true,currency:true,locale:true,email:true,phone:true,companyName:true,addressText:true,settings:true}});
    if(!store) throw new NotFoundException('Store not found');
    const sourceMode=!!context.sourceMode;
    const customer=context.customer||null;
    const order=context.order||null;
    const storeUrl=this.emailStoreUrl(store);
    const to=String(context.to||customer?.email||'');
    let unsubscribeUrl='';
    if(to&&emailPattern.test(to)){
      try{unsubscribeUrl=`${String(process.env.EMAIL_PUBLIC_BASE_URL||'').replace(/\/$/,'')}/v1/email/unsubscribe/${this.unsubscribeToken(tenantId,to)}`;}catch{}
    }
    const tenantMail=await this.db.tenantEmailSettings.findUnique({where:{tenantId}}).catch(()=>null);
    let senderEmail=platformSenderForSlug(String(store.slug||'bildirim'));
    if(tenantMail?.senderMode==='CUSTOM_DOMAIN'&&tenantMail?.senderLocal&&tenantMail?.customDomainId){
      const senderDomain=await this.db.tenantEmailDomain.findFirst({where:{id:tenantMail.customDomainId,tenantId,status:'VERIFIED'},select:{domain:true}}).catch(()=>null);
      if(senderDomain?.domain)senderEmail=`${tenantMail.senderLocal}@${senderDomain.domain}`;
    }
    const general:any=(store.settings as any)?.general||{};
    const invoice:any=general?.invoice||{};
    const privacyUrl=String(general?.privacyUrl||general?.legal?.privacyUrl||storeUrl);
    const vars:Record<string,string>={
      store_name:String(store.name||''),
      store_url:storeUrl,
      customer_name:String(context.customerName||[customer?.firstName,customer?.lastName].filter(Boolean).join(' ')||'Müşterimiz'),
      order_no:String(order?.number||context.orderNo||'1001'),
      order_total:this.templateMoney(order?.grandTotal??context.orderTotal??0,String(order?.currency||store.currency||'TRY'),locale||store.locale),
      tracking_no:String(context.trackingNo||order?.shipments?.[0]?.trackingCode||''),
      order_url:String(context.orderUrl||`${storeUrl}/account/orders/${order?.id||''}`),
      recipient_email:to,
      sender_email:senderEmail,
      support_phone:String(store.phone||''),
      support_email:String(store.email||''),
      privacy_url:privacyUrl,
      company_name:String(store.companyName||store.name||''),
      store_address:store.addressText?` · ${String(store.addressText)}`:'',
      mersis_label:invoice?.mersisNo?'MERSİS No: ':'',
      mersis_no:String(invoice?.mersisNo||''),
      year:String(new Date().getFullYear()),
      unsubscribe_url:unsubscribeUrl,
    };
    if(sourceMode) for(const key of Object.keys(vars)) vars[key]=`{{${key}}}`;
    const subject=this.templateReplace(template?.subject||`${store.name} bildirimi`,vars).slice(0,150);
    const preheader=this.templateReplace(template?.preheader||'',vars);
    const blocks=Array.isArray(template?.blocks)?template.blocks:[];
    const safeColor=(v:any,f:string)=>/^#[0-9a-f]{6}$/i.test(String(v||''))?String(v):f;
    const align=(v:any)=>['left','center','right'].includes(String(v))?String(v):'left';
    const pad=(v:any)=>Math.max(0,Math.min(80,Number(v)||0));
    const safeNum=(v:any,f:number,min=0,max=80)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):f));
    const designRaw=template?.design&&typeof template.design==='object'?template.design:{};
    const allowedFonts=['Arial, Helvetica, sans-serif','Inter, Arial, Helvetica, sans-serif','Helvetica, Arial, sans-serif','Verdana, Geneva, sans-serif','Tahoma, Geneva, sans-serif','Georgia, serif'];
    const fontFamily=allowedFonts.includes(String(designRaw.fontFamily||''))?String(designRaw.fontFamily):'Arial, Helvetica, sans-serif';
    const design={
      fontFamily,
      bodyBackground:safeColor(designRaw.bodyBackground,'#f3f4f6'),
      contentBackground:safeColor(designRaw.contentBackground,'#ffffff'),
      textColor:safeColor(designRaw.textColor,'#111827'),
      headingColor:safeColor(designRaw.headingColor,'#111827'),
      primaryColor:safeColor(designRaw.primaryColor,'#1937a7'),
      contentRadius:safeNum(designRaw.contentRadius,12,0,40),
      buttonRadius:safeNum(designRaw.buttonRadius,8,0,40),
    };
    const render=async(b:any)=>{
      const t=String(b?.type||'').toUpperCase();
      const c=b?.content&&typeof b.content==='object'?b.content:{};
      const st=b?.settings&&typeof b.settings==='object'?b.settings:{};
      const style=`text-align:${align(st.align)};background:${safeColor(st.background,design.contentBackground)};color:${safeColor(st.textColor,design.textColor)};padding:${pad(st.padding??16)}px;font-family:${design.fontFamily}`;
      if(t==='HEADER'){
        const selectedLogo=String(c.logoUrl||store.logoUrl||'');
        const logo=c.showLogo!==false&&/^https:\/\//i.test(selectedLogo)
          ? `<img src="${escape(selectedLogo)}" alt="${escape(store.name)}" style="max-height:52px;max-width:220px;height:auto;border:0">`
          : `<div style="font-size:24px;font-weight:700;color:${design.headingColor}">${escape(store.name)}</div>`;
        return `<div style="${style}">${logo}</div>`;
      }
      if(t==='HEADING') return `<div style="${style};font-size:22px;line-height:1.45;font-weight:700;color:${design.headingColor}">${escape(this.templateReplace(c.text||'',vars))}</div>`;
      if(t==='TEXT') return `<div style="${style};font-size:15px;line-height:1.7;white-space:pre-wrap">${escape(this.templateReplace(c.text||'',vars))}</div>`;
      if(t==='IMAGE'){
        const u=this.templateReplace(c.url||'',vars);if(!/^https:\/\//i.test(u))return '';
        const rawLink=this.templateReplace(c.linkUrl||'',vars);let href='';if(rawLink.startsWith('/'))href=`${storeUrl}${rawLink}`;else if(/^https:\/\//i.test(rawLink))href=rawLink;
        const image=`<img src="${escape(u)}" alt="${escape(this.templateReplace(c.alt||'',vars))}" style="display:block;width:100%;max-width:100%;height:auto;border:0">`;
        return `<div style="background:${safeColor(st.background,design.contentBackground)};padding:0">${href?`<a href="${escape(href)}" style="display:block;text-decoration:none">${image}</a>`:image}</div>`;
      }
      if(t==='BUTTON'){
        const href=this.templateReplace(c.url||vars.order_url,vars);
        const radius=safeNum(st.radius,design.buttonRadius,0,40);
        return /^https:\/\//i.test(href)?`<div style="${style}"><a href="${escape(href)}" style="display:inline-block;background:${safeColor(st.buttonColor,design.primaryColor)};color:#fff;padding:12px 20px;border-radius:${radius}px;text-decoration:none;font-weight:700">${escape(this.templateReplace(c.text||'İncele',vars))}</a></div>`:'';
      }
      if(t==='COLUMNS') return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${style}"><tr><td width="50%" valign="top" style="padding-right:8px">${escape(this.templateReplace(c.left||'',vars))}</td><td width="50%" valign="top" style="padding-left:8px">${escape(this.templateReplace(c.right||'',vars))}</td></tr></table>`;
      if(t==='DIVIDER') return `<div style="padding:12px 16px;background:${design.contentBackground}"><hr style="border:0;border-top:1px solid #e5e7eb;margin:0"></div>`;
      if(t==='SPACER') return `<div style="height:${Math.max(8,Math.min(160,Number(st.height)||24))}px;background:${design.contentBackground}"></div>`;
      if(t==='ORDER_SUMMARY'){
        if(sourceMode) return `<div data-ticarti-block="${Buffer.from(JSON.stringify(b)).toString('base64')}"></div>`;
        const sampleOrder=order||{currency:store.currency||'TRY',items:[{title:'Örnek Ürün',quantity:1,total:899.9,imageUrl:''},{title:'İkinci Ürün',quantity:1,total:400,imageUrl:''}],grandTotal:1299.9};
        const lines=(sampleOrder.items||[]).map((it:any)=>{
          const imageUrl=String(it.imageUrl||it.variant?.media?.[0]?.image?.url||it.variant?.product?.images?.[0]?.url||'');
          const image=/^https:\/\//i.test(imageUrl)?`<td width="64" style="padding:8px 12px 8px 0;border-bottom:1px solid #eee"><img src="${escape(imageUrl)}" alt="${escape(it.title||'Ürün')}" width="52" height="52" style="display:block;width:52px;height:52px;object-fit:cover;border-radius:7px;border:1px solid #e5e7eb"></td>`:'<td width="1" style="padding:0;border-bottom:1px solid #eee"></td>';
          return `<tr>${image}<td style="padding:8px 0;border-bottom:1px solid #eee"><div style="font-weight:600">${escape(it.title)}</div>${it.variantTitle?`<div style="font-size:12px;color:#6b7280;margin-top:2px">${escape(it.variantTitle)}</div>`:''}</td><td align="center" style="padding:8px;border-bottom:1px solid #eee">${Number(it.quantity||0)}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #eee;white-space:nowrap">${escape(this.templateMoney(it.total,sampleOrder.currency||store.currency,locale))}</td></tr>`;
        }).join('');
        const totalLabel=order?vars.order_total:this.templateMoney(sampleOrder.grandTotal||0,sampleOrder.currency||store.currency,locale);
        return `<div style="${style}"><div style="font-size:17px;font-weight:700;margin-bottom:10px;color:${design.headingColor}">Sipariş özeti</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${lines}<tr><td colspan="3" style="padding-top:12px;font-weight:700">Toplam</td><td align="right" style="padding-top:12px;font-weight:700">${escape(totalLabel)}</td></tr></table></div>`;
      }
      if(t==='PRODUCT_GRID'){
        if(sourceMode) return `<div data-ticarti-block="${Buffer.from(JSON.stringify(b)).toString('base64')}"></div>`;
        const products:any[]=await this.templateProducts(tenantId,b);
        const cols=Math.max(1,Math.min(2,Number(c.columns)||2));
        const radius=safeNum(st.radius,design.buttonRadius,0,40);
        const showCategory=c.showCategory!==false;
        const showTitle=c.showTitle!==false;
        const showPrice=c.showPrice!==false;
        const showButton=c.showButton!==false;
        const buttonText=this.templateReplace(c.buttonText||'Ürünü incele',vars);
        const cells=products.map((p:any)=>{
          const categoryLabel=String(p.categories?.[0]?.category?.name||'');
          const price=p.variants?.[0]?.price;
          const compare=p.variants?.[0]?.comparePrice;
          return `<td width="${Math.floor(100/cols)}%" valign="top" style="padding:8px"><div style="border:1px solid #e5e7eb;border-radius:${design.contentRadius}px;overflow:hidden;background:#fff"><a href="${escape(`${storeUrl}/product/${encodeURIComponent(p.slug)}`)}" style="color:#111827;text-decoration:none;display:block">${p.images?.[0]?.url?`<img src="${escape(p.images[0].url)}" alt="${escape(p.images[0].alt||p.title)}" style="display:block;width:100%;aspect-ratio:1/1;object-fit:cover;border:0">`:''}<div style="padding:12px">${showCategory&&categoryLabel?`<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:4px">${escape(categoryLabel)}</div>`:''}${showTitle?`<div style="font-weight:700">${escape(p.title)}</div>`:''}${showPrice&&price!=null?`<div style="margin-top:6px">${escape(this.templateMoney(price,store.currency,locale))}${compare!=null?` <span style="color:#6b7280;text-decoration:line-through">${escape(this.templateMoney(compare,store.currency,locale))}</span>`:''}</div>`:''}${showButton?`<div style="margin-top:12px"><span style="display:inline-block;background:${design.primaryColor};color:#fff;padding:10px 14px;border-radius:${radius}px;font-weight:700">${escape(buttonText)}</span></div>`:''}</div></a></div></td>`;
        });
        let rows='';
        for(let i=0;i<cells.length;i+=cols) rows+=`<tr>${cells.slice(i,i+cols).join('')}</tr>`;
        return `<div style="${style}">${c.title?`<div style="font-size:18px;font-weight:700;margin-bottom:8px;color:${design.headingColor}">${escape(this.templateReplace(c.title,vars))}</div>`:''}<table role="presentation" width="100%">${rows}</table></div>`;
      }
      if(t==='MENU'){
        if(sourceMode) return `<div data-ticarti-block="${Buffer.from(JSON.stringify(b)).toString('base64')}"></div>`;
        const items=await this.templateMenuItems(tenantId,b,locale,storeUrl);const separator=escape(String(c.separator||' · ').slice(0,8));const fontSize=Math.max(10,Math.min(28,Number(c.fontSize)||14));const menuStyle=String(c.style||'SIMPLE').toUpperCase();const color=safeColor(st.textColor,design.textColor);
        const itemCss=menuStyle==='PILLS'?`display:inline-block;padding:7px 12px;border-radius:999px;background:${design.bodyBackground};color:${color};text-decoration:none;font-weight:600`:menuStyle==='BORDERED'?`display:inline-block;padding:7px 12px;border:1px solid ${color};border-radius:6px;color:${color};text-decoration:none;font-weight:600`:menuStyle==='UNDERLINE'?`color:${color};text-decoration:underline;text-underline-offset:3px;font-weight:600`:`color:${color};text-decoration:none;font-weight:600`;
        if(menuStyle==='FULL_WIDTH'){
          const width=Math.max(1,Math.floor(100/Math.max(1,items.length)));
          const cells=items.map((item:any,index:number)=>`<td width="${width}%" align="center" valign="middle" style="${index?`border-left:1px solid #e5e7eb;`:''}padding:0"><a href="${escape(item.url)}" style="display:block;padding:10px 8px;color:${color};text-decoration:none;font-weight:600">${escape(item.label)}</a></td>`).join('');
          return cells?`<div style="${style};font-size:${fontSize}px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed"><tr>${cells}</tr></table></div>`:'';
        }
        const glue=menuStyle==='PILLS'||menuStyle==='BORDERED'?'&nbsp;':`<span style="color:#9ca3af">${separator}</span>`;
        const links=items.map((item:any)=>`<a href="${escape(item.url)}" style="${itemCss}">${escape(item.label)}</a>`).join(glue);
        return links?`<div style="${style};font-size:${fontSize}px;line-height:1.8">${links}</div>`:'';
      }
      if(t==='FOOTER'){
        const raw=String(c.legalHtml||this.defaultLegalFooterHtml(locale));
        const legal=this.templateReplace(this.safeTemplateHtml(raw),vars);
        const footerParts:string[]=[];
        const pos=(v:any)=>['left','center','right'].includes(String(v))?String(v):'center';
        const logoUrl=String(c.logoUrl||store.logoUrl||'');
        if(c.showLogo===true){
          if(/^https:\/\//i.test(logoUrl)) footerParts.push(`<div style="text-align:${pos(c.logoPosition)};margin-bottom:14px"><img src="${escape(logoUrl)}" alt="${escape(store.name)}" style="display:inline-block;max-height:52px;max-width:220px;height:auto;border:0"></div>`);
          else footerParts.push(`<div style="text-align:${pos(c.logoPosition)};margin-bottom:14px;font-size:18px;font-weight:700;color:${design.headingColor}">${escape(store.name)}</div>`);
        }
        const socialNames:Record<string,string>={instagram:'Instagram',facebook:'Facebook',x:'X',tiktok:'TikTok',youtube:'YouTube',linkedin:'LinkedIn'};
        if(c.showSocials===true&&c.socialLinks&&typeof c.socialLinks==='object'){
          const links=Object.entries(c.socialLinks).map(([key,url])=>{const href=String(url||'').trim();return socialNames[key]&&/^https:\/\//i.test(href)?`<a href="${escape(href)}" style="color:#6b7280;text-decoration:underline;margin:0 5px">${socialNames[key]}</a>`:''}).filter(Boolean).join('');
          if(links) footerParts.push(`<div style="text-align:${pos(c.socialPosition)};margin-bottom:12px">${links}</div>`);
        }
        if(c.showContact!==false){
          const phone=String(c.contactPhone||vars.support_phone||'').trim();
          const email=String(c.contactEmail||vars.support_email||'').trim();
          const website=String(c.contactWebsite||vars.store_url||'').trim();
          const contact:string[]=[];
          if(phone) contact.push(`<span style="margin:0 5px">${escape(phone)}</span>`);
          if(email&&emailPattern.test(email)) contact.push(`<a href="mailto:${escape(email)}" style="color:#6b7280;text-decoration:underline;margin:0 5px">${escape(email)}</a>`);
          if(/^https:\/\//i.test(website)) contact.push(`<a href="${escape(website)}" style="color:#6b7280;text-decoration:underline;margin:0 5px">${escape(website.replace(/^https?:\/\//i,''))}</a>`);
          if(contact.length) footerParts.push(`<div style="text-align:${pos(c.contactPosition)};margin-bottom:12px">${contact.join('')}</div>`);
        }
        footerParts.push(`<div>${legal}</div>`);
        return `<div style="${style};font-size:12px;line-height:1.6;color:#6b7280">${footerParts.join('')}</div>`;
      }
      return '';
    };
    let inner='';
    if(String(template?.editorMode||'VISUAL').toUpperCase()==='HTML'&&String(template?.html||'').trim()){
      const source=this.safeTemplateHtml(template.html);
      const marker=/<div\s+data-ticarti-block="([^"]+)"\s*><\/div>/gi;
      let custom='',last=0;
      for(const match of source.matchAll(marker)){
        const index=Number(match.index||0);
        custom+=this.templateReplace(source.slice(last,index),vars);
        try{const block=JSON.parse(Buffer.from(String(match[1]),'base64').toString('utf8'));custom+=await render(block);}catch{}
        last=index+String(match[0]).length;
      }
      custom+=this.templateReplace(source.slice(last),vars);
      const styles=(custom.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi)||[]).join('');
      const bodyMatch=custom.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
      inner=styles+(bodyMatch?bodyMatch[1]:custom.replace(/<!doctype[^>]*>/gi,'').replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi,'').replace(/<\/?(?:html|body)\b[^>]*>/gi,''));
    } else {
      for(const block of blocks) inner+=await render(block);
    }
    if(!inner) inner=`<div style="padding:24px;background:${design.contentBackground};font-family:${design.fontFamily}"><h2 style="margin:0 0 12px;color:${design.headingColor}">${escape(store.name)}</h2><p style="margin:0">${escape(vars.customer_name)}</p></div>`;
    if(unsubscribeUrl&&!/unsubscribe|abonelikten|pazarlama e-postalarından/i.test(inner)) inner+=`<div style="padding:16px 24px;background:${design.contentBackground};font-size:12px;color:#6b7280;text-align:center;font-family:${design.fontFamily}"><a href="${escape(unsubscribeUrl)}" style="color:#6b7280">Pazarlama e-postalarından ayrıl</a></div>`;
    const html=`<!doctype html><html lang="${escape(locale||store.locale||'tr-TR')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(subject)}</title></head><body style="margin:0;background:${design.bodyBackground};font-family:${design.fontFamily};color:${design.textColor}"><span style="display:none!important;max-height:0;opacity:0;overflow:hidden">${escape(preheader)}</span><main style="max-width:680px;margin:0 auto;padding:24px 12px"><div style="background:${design.contentBackground};border-radius:${design.contentRadius}px;overflow:hidden;border:1px solid #e5e7eb">${inner}</div></main></body></html>`;
    const text=inner.replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().slice(0,20000)||`${store.name} bildirimi`;
    return {subject,preheader,html,text,variables:vars,sourceHtml:sourceMode?inner:undefined};
  }
  private async templateFromSettings(tenantId:string,event:string,locale?:string){const store:any=await this.db.tenant.findUnique({where:{id:tenantId},select:{locale:true,settings:true}});if(!store)throw new NotFoundException();const comm:any=(store.settings as any)?.communication||{},aliases:Record<string,string[]>={return_requested:['refund_requested'],return_approved:['refund_approved']},eventKeys=[event,...(aliases[event]||[])];for(const eventKey of eventKeys){const by:any=comm.emailTemplates?.[eventKey]||{};for(const key of [locale,locale?.split('-')[0],store.locale,store.locale?.split('-')[0],'tr-TR','tr'].filter(Boolean).map(String))if(by[key])return{template:by[key],locale:key,replyTo:comm.sender?.replyTo||null};const first=Object.entries(by)[0] as any;if(first)return{template:first[1],locale:first[0],replyTo:comm.sender?.replyTo||null};}return null;}
  private async templateSampleContext(tenantId:string,to='preview@example.com'){
    const store=await this.db.tenant.findUnique({where:{id:tenantId},select:{currency:true}});
    const rows:any[]=await this.db.product.findMany({where:{storeId:tenantId,status:'ACTIVE'},orderBy:[{publishedAt:'desc'},{createdAt:'desc'}],take:2,select:{id:true,title:true,images:{orderBy:{sortOrder:'asc'},take:1,select:{url:true}},variants:{where:{isActive:true},take:1,orderBy:{price:'asc'},select:{title:true,price:true,media:{orderBy:{sortOrder:'asc'},take:1,select:{image:{select:{url:true}}}}}}}}).catch(()=>[]);
    const currency=String(store?.currency||'TRY');
    const items=rows.length?rows.map((p:any)=>{const v=p.variants?.[0];return{title:p.title,variantTitle:v?.title||'',quantity:1,total:Number(v?.price||0),imageUrl:String(v?.media?.[0]?.image?.url||p.images?.[0]?.url||'')}}):[{title:'Örnek Ürün',variantTitle:'Standart',quantity:1,total:899.90,imageUrl:''},{title:'İkinci Ürün',variantTitle:'Standart',quantity:1,total:400,imageUrl:''}];
    const grandTotal=items.reduce((sum:number,item:any)=>sum+Number(item.total||0),0);
    return{to,customer:{firstName:'Ayşe',lastName:'Yılmaz',email:to},customerName:'Ayşe Yılmaz',order:{id:'preview-order',number:'TEST-1001',grandTotal,currency,items,shipments:[{trackingCode:'TEST-TRACK'}]},orderNo:'TEST-1001',orderTotal:grandTotal,trackingNo:'TEST-TRACK'};
  }
  async templatePreview(tenantId:string,body:any){
    const event=clean(body?.event||'order_created',80),locale=clean(body?.locale||'tr-TR',20),source=body?.template&&typeof body.template==='object'?{template:body.template,locale,replyTo:null}:await this.templateFromSettings(tenantId,event,locale);
    const context=await this.templateSampleContext(tenantId,body?.to||'preview@example.com');
    if(body?.source) (context as any).sourceMode=true;
    return this.renderTemplate(tenantId,source?.template||{subject:'{{store_name}} · Önizleme',blocks:[]},event,source?.locale||locale,context);
  }
  async testTemplate(tenantId:string,body:any){
    const to=safeAddress(body?.to),event=clean(body?.event||'order_created',80),locale=clean(body?.locale||'tr-TR',20),source=body?.template&&typeof body.template==='object'?{template:body.template,locale,replyTo:null}:await this.templateFromSettings(tenantId,event,locale);
    if(!source?.template)throw new NotFoundException('E-posta şablonu bulunamadı');
    const r=await this.renderTemplate(tenantId,source.template,event,source.locale,await this.templateSampleContext(tenantId,to));
    return this.sendTransactional({tenantId,to,subject:`[TEST] ${r.subject}`,text:r.text,html:r.html,replyTo:source.replyTo});
  }
  async sendOrderTemplateEvent(tenantId:string,event:string,orderId:string){
    try{
      const source=await this.templateFromSettings(tenantId,event);
      if(!source?.template||source.template.enabled===false)return{skipped:true};
      const order:any=await this.db.order.findFirst({
        where:{id:orderId,storeId:tenantId},
        include:{
          customer:true,
          items:{include:{variant:{include:{media:{include:{image:true},orderBy:{sortOrder:'asc'},take:1},product:{include:{images:{orderBy:{sortOrder:'asc'},take:1}}}}}}},
          shipments:{orderBy:{createdAt:'desc'},take:1},
        },
      });
      if(!order?.customer?.email)return{skipped:true};
      const missingProductIds:string[]=[...new Set<string>((order.items||[]).filter((it:any)=>!it.variant?.media?.[0]?.image?.url&&!it.variant?.product?.images?.[0]?.url&&it.productIdSnapshot).map((it:any)=>String(it.productIdSnapshot)))];
      const fallbackProducts=missingProductIds.length?await this.db.product.findMany({where:{storeId:tenantId,id:{in:missingProductIds}},select:{id:true,images:{orderBy:{sortOrder:'asc'},take:1,select:{url:true}}}}):[];
      const fallbackMap=new Map(fallbackProducts.map((p:any)=>[String(p.id),String(p.images?.[0]?.url||'')]));
      order.items=(order.items||[]).map((it:any)=>({...it,imageUrl:String(it.variant?.media?.[0]?.image?.url||it.variant?.product?.images?.[0]?.url||fallbackMap.get(String(it.productIdSnapshot||''))||'')}));
      const r=await this.renderTemplate(tenantId,source.template,event,source.locale,{to:order.customer.email,customer:order.customer,order,trackingNo:order.shipments?.[0]?.trackingCode||''});
      return this.sendTransactional({tenantId,to:order.customer.email,subject:r.subject,text:r.text,html:r.html,replyTo:source.replyTo});
    }catch(error:any){
      console.error('[email-template-event]',{tenantId,event,orderId,error:String(error?.message||error)});
      return{accepted:false};
    }
  }
  async receiveSns(raw:unknown,scope:'TX'|'MKT'='MKT'){
    const currentCfg=await this.sesConfiguration();
    const topic=scope==='TX'?currentCfg.txSnsTopicArn:currentCfg.mktSnsTopicArn;
    const notice=await verifySns(raw,topic);
    if(notice.Type==='SubscriptionConfirmation'){
      const confirmUrl=new URL(notice.SubscribeURL);
      const expectedRegion=topic.split(':')[3];
      if(confirmUrl.protocol!=='https:'||confirmUrl.hostname!==`sns.${expectedRegion}.amazonaws.com`||confirmUrl.port||confirmUrl.username||confirmUrl.password||confirmUrl.pathname!=='/'||confirmUrl.hash||confirmUrl.searchParams.get('Action')!=='ConfirmSubscription'||confirmUrl.searchParams.get('TopicArn')!==topic||confirmUrl.searchParams.get('Token')!==notice.Token){
        throw new ForbiddenException('SNS confirmation URL invalid');
      }
      const response=await fetch(confirmUrl.toString(),{method:'GET',redirect:'error',signal:AbortSignal.timeout(5000)});
      if(!response.ok)throw new ServiceUnavailableException('SNS subscription confirmation failed');
      return {verified:true,confirmed:true};
    }
    const data=JSON.parse(notice.Message);
    const event=String(data.eventType||data.notificationType||'').toUpperCase();
    if(!['BOUNCE','COMPLAINT'].includes(event))return {ignored:true};
    const messageId=String(data.mail?.messageId||'');
    if(scope==='TX'){
      const sent=await this.db.emailTransactionalMessage.findUnique({where:{providerId:messageId}});
      if(!sent)return {ignored:true};
      const bounceType=String(data.bounce?.bounceType||'');if(event==='BOUNCE'&&bounceType!=='Permanent')return {ignored:true};
      const addresses=(event==='BOUNCE'?data.bounce?.bouncedRecipients:data.complaint?.complainedRecipients)||[];
      if(!addresses.some((r:any)=>hash(String(r.emailAddress||''))===sent.emailHash))return {ignored:true};
      try{await this.db.$transaction(async tx=>{
        await tx.emailProviderEvent.create({data:{messageId:notice.MessageId,tenantId:sent.tenantId,providerId:messageId,type:`TX_${event}`}});
        await tx.emailGlobalSuppression.upsert({where:{emailHash:sent.emailHash},create:{emailHash:sent.emailHash,reason:event},update:{reason:event}});
      })}catch(e:any){if(e?.code!=='P2002')throw e;}
      return {ok:true};
    }
    const job=await this.db.emailMarketingJob.findFirst({where:{providerId:messageId},select:{tenantId:true,id:true,emailHash:true}});
    if(!job)return {ignored:true};
    const emails=(event==='BOUNCE'?data.bounce?.bouncedRecipients:data.complaint?.complainedRecipients)||[];
    const bounceType=String(data.bounce?.bounceType||'');
    if(event==='BOUNCE'&&bounceType!=='Permanent')return {ignored:true};
    const addresses=new Set<string>(emails.map((r:any)=>String(r.emailAddress||'').trim().toLowerCase()));
    if(![...addresses].some(x=>hash(x)===job.emailHash))return {ignored:true};
    try{
      await this.db.$transaction(async tx=>{
        await tx.emailProviderEvent.create({data:{messageId:notice.MessageId,tenantId:job.tenantId,providerId:messageId,type:event}});
        await tx.emailSuppression.upsert({where:{tenantId_scope_emailHash:{tenantId:job.tenantId,scope:'MARKETING',emailHash:job.emailHash}},create:{tenantId:job.tenantId,scope:'MARKETING',emailHash:job.emailHash,reason:event},update:{reason:event}});
        await tx.emailMarketingJob.updateMany({where:{tenantId:job.tenantId,emailHash:job.emailHash,status:'PENDING'},data:{status:'CANCELLED'}});
      });
    }catch(e:any){if(e?.code!=='P2002')throw e;}
    return {ok:true};
  }
  async overview() {
    const [policy, pending, campaigns, domains, suppressed, disputed, feedback, sesConfig] = await Promise.all([
      this.policy(), this.db.emailMarketingJob.count({where:{status:{in:['PENDING','LEASED']}}}),
      this.db.emailCampaign.count(), this.db.tenantEmailDomain.count(),this.db.emailSuppression.count({where:{scope:'MARKETING'}}),
      this.db.emailMarketingJob.count({where:{status:'LEASED',lockedUntil:{lt:new Date()}}}),
      this.db.emailProviderEvent.groupBy({by:['type'],_count:{_all:true}}), this.sesConfiguration(),
    ]);
    return {sesConfig,transactionalEnabled:policy?.transactionalEnabled!==false, marketingEnabled:policy?.marketingEnabled===true && process.env.EMAIL_MARKETING_SEND_ENABLED==='true',
      marketingPolicyEnabled:policy?.marketingEnabled===true, pending, campaigns, domains,suppressed,needsReconciliation:disputed,
      feedback:Object.fromEntries(feedback.map(e=>[e.type,e._count._all])),
      transactional:{region:process.env.AWS_SES_TX_REGION||null,identity:PLATFORM_DOMAIN,credentialConfigured:!!(process.env.AWS_SES_TX_ACCESS_KEY_ID&&process.env.AWS_SES_TX_SECRET_ACCESS_KEY)},
      marketing:{region:process.env.AWS_SES_MKT_REGION||null,credentialConfigured:!!(process.env.AWS_SES_MKT_ACCESS_KEY_ID&&process.env.AWS_SES_MKT_SECRET_ACCESS_KEY)}};
  }
  async sesConfiguration() {
    const row=await this.db.emailSesConfiguration.findUnique({where:{id:'default'}});
    const txRegion=row?.txRegion||process.env.AWS_SES_TX_REGION||'eu-central-1';
    const txConfigurationSet=row?.txConfigurationSet||process.env.AWS_SES_TX_CONFIGURATION_SET||'';
    const txSnsTopicArn=row?.txSnsTopicArn||process.env.AWS_SES_TX_SNS_TOPIC_ARN||'';
    const mktRegion=row?.mktRegion||process.env.AWS_SES_MKT_REGION||'';
    const mktConfigurationSet=row?.mktConfigurationSet||process.env.AWS_SES_MKT_CONFIGURATION_SET||'';
    const mktSnsTopicArn=row?.mktSnsTopicArn||process.env.AWS_SES_MKT_SNS_TOPIC_ARN||'';
    return {txRegion,txConfigurationSet,txSnsTopicArn,mktRegion,mktConfigurationSet,mktSnsTopicArn,
      txCredentialsConfigured:!!(process.env.AWS_SES_TX_ACCESS_KEY_ID&&process.env.AWS_SES_TX_SECRET_ACCESS_KEY),
      mktCredentialsConfigured:!!(process.env.AWS_SES_MKT_ACCESS_KEY_ID&&process.env.AWS_SES_MKT_SECRET_ACCESS_KEY),
      txConfigured:!!(txRegion&&txConfigurationSet&&txSnsTopicArn&&process.env.AWS_SES_TX_ACCESS_KEY_ID&&process.env.AWS_SES_TX_SECRET_ACCESS_KEY),
      mktConfigured:!!(mktRegion&&mktConfigurationSet&&mktSnsTopicArn&&process.env.AWS_SES_MKT_ACCESS_KEY_ID&&process.env.AWS_SES_MKT_SECRET_ACCESS_KEY)};
  }
  async updateSesConfiguration(body:any) {
    if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('Invalid settings');
    const required=['txRegion','txConfigurationSet','txSnsTopicArn'];
    const optional=['mktRegion','mktConfigurationSet','mktSnsTopicArn'];
    const input:any={};
    for(const k of [...required,...optional]) {
      if(!Object.prototype.hasOwnProperty.call(body,k))continue;
      if(typeof body[k]!=='string')throw new BadRequestException('Invalid '+k);
      input[k]=body[k].trim();
      if(input[k].length>300)throw new BadRequestException('Invalid '+k);
    }
    if(!Object.keys(input).length)throw new BadRequestException('No settings');
    for(const key of ['txRegion','mktRegion'])if(input[key]&&!/^[a-z]{2}(?:-gov)?-[a-z]+-\d$/.test(input[key]))throw new BadRequestException('Invalid SES region');
    for(const key of ['txConfigurationSet','mktConfigurationSet'])if(input[key]&&!/^[A-Za-z0-9_-]{1,64}$/.test(input[key]))throw new BadRequestException('Invalid configuration set');
    for(const scope of ['tx','mkt']) {
      const arn=input[scope+'SnsTopicArn'];const region=input[scope+'Region'];
      if(arn&&!/^arn:aws[a-z-]*:sns:[a-z0-9-]+:\d{12}:[A-Za-z0-9_-]{1,256}$/.test(arn))throw new BadRequestException('Invalid SNS ARN');
      if(arn&&region&&arn.split(':')[3]!==region)throw new BadRequestException('SNS topic region mismatch');
    }
    await this.db.emailSesConfiguration.upsert({where:{id:'default'},create:{id:'default',...input},update:input});
    this.txClient=undefined;this.mktClient=undefined;
    return this.sesConfiguration();
  }
  async testSesEmail(toInput:any) {
    const to=safeAddress(toInput);
    const cfg=await this.sesConfiguration();
    if(!cfg.txConfigured)throw new ServiceUnavailableException('Transactional SES settings incomplete');
    const result=await this.sendTransactional({to,subject:'TICARTI SES bağlantı testi',text:'TICARTI işlem e-posta gönderim bağlantısı testi.'});
    return {accepted:result.accepted};
  }

  async setGlobal(body:any) {
    const keys=['transactionalEnabled','marketingEnabled'];
    const data:any={}; for (const key of keys) if (Object.prototype.hasOwnProperty.call(body,key)) {if(typeof body[key]!=='boolean') throw new BadRequestException('Boolean expected'); data[key]=body[key];}
    if (!Object.keys(data).length) throw new BadRequestException('No changes');
    return this.db.emailPlatformPolicy.upsert({where:{id:'default'},create:{id:'default',...data},update:data});
  }
  async tenantPolicy(tenantId:string, update?:any) {
    if (update) {
      const approval=clean(update.approvalStatus,32);
      if (!['APPROVED','REJECTED','SUSPENDED'].includes(approval)) throw new BadRequestException('Invalid approval');
      return this.db.tenantEmailMarketingPolicy.upsert({where:{tenantId},create:{tenantId,approvalStatus:approval,enabled:approval==='APPROVED'},update:{approvalStatus:approval,enabled:approval==='APPROVED',suspendedReason:approval==='SUSPENDED'?clean(update.reason||'',200):null}});
    }
    return this.db.tenantEmailMarketingPolicy.findUnique({where:{tenantId}});
  }
  async tenants(){return this.db.tenantEmailMarketingPolicy.findMany({include:{tenant:{select:{name:true,slug:true}}},orderBy:{updatedAt:'desc'},take:100});}
  async unsuppressTransactional(email:unknown,reason:unknown){
    const value=safeAddress(email),explanation=clean(reason,300);
    if(explanation.length<10)throw new BadRequestException('A reason of at least 10 characters is required');
    const result=await this.db.emailGlobalSuppression.deleteMany({where:{emailHash:hash(value)}});
    console.info('[transactional-email] global suppression manually removed', {emailHash:hash(value),reason:explanation,removed:result.count});
    return {removed:result.count};
  }
  async importIys(tenantId:string,body:any){
    if(!await this.db.tenant.findUnique({where:{id:tenantId},select:{id:true}}))throw new NotFoundException();
    if(!Array.isArray(body?.entries)||body.entries.length<1||body.entries.length>100)throw new BadRequestException('Provide 1 to 100 IYS results');
    for(const entry of body.entries){
      const emailHash=hash(safeAddress(entry.email)),status=clean(entry.status,20),receiptRef=clean(entry.receiptRef,160);
      if(!['OPT_IN','OPT_OUT'].includes(status)||!receiptRef)throw new BadRequestException('IYS status and receipt required');
      await this.db.emailIysConsent.upsert({where:{tenantId_emailHash:{tenantId,emailHash}},create:{tenantId,emailHash,status,receiptRef,source:'IYS_IMPORT',checkedAt:new Date()},update:{status,receiptRef,source:'IYS_IMPORT',checkedAt:new Date()}});
      if(status==='OPT_OUT')await this.db.emailSuppression.upsert({where:{tenantId_scope_emailHash:{tenantId,scope:'MARKETING',emailHash}},create:{tenantId,scope:'MARKETING',emailHash,reason:'IYS_OPT_OUT'},update:{reason:'IYS_OPT_OUT'}});
    }
    return {imported:body.entries.length};
  }
  async requestAccess(tenantId:string) {
    const existing=await this.tenantPolicy(tenantId); if (existing?.approvalStatus==='SUSPENDED') throw new ForbiddenException('Account suspended');
    return this.db.tenantEmailMarketingPolicy.upsert({where:{tenantId},create:{tenantId,approvalStatus:'PENDING'},update:{approvalStatus:'PENDING',enabled:false}});
  }
  async settings(tenantId:string) {
    const [tenant,settings,domains,policy] = await Promise.all([
      this.db.tenant.findUnique({where:{id:tenantId},select:{name:true,slug:true,email:true}}),
      this.db.tenantEmailSettings.findUnique({where:{tenantId}}),
      this.db.tenantEmailDomain.findMany({where:{tenantId},orderBy:{createdAt:'desc'},take:50}),this.tenantPolicy(tenantId),
    ]);
    if (!tenant) throw new NotFoundException();
    const address=platformSenderForSlug(tenant.slug);
    return {senderMode:settings?.senderMode||'PLATFORM_DEFAULT',senderName:settings?.senderName||tenant.name,senderAddress:address,
      replyTo:settings?.replyVerified?settings.replyTo:(process.env.AWS_SES_TX_DEFAULT_REPLY_TO||'info@ticarti.com'),
      replyVerified:settings?.replyVerified||false, senderLocal:settings?.senderLocal||'siparis',customDomainId:settings?.customDomainId||null,
      domains,marketingPolicy:policy||{enabled:false,approvalStatus:'NOT_REQUESTED'}};
  }
  async updateSettings(tenantId:string, body:any) {
    const senderMode=clean(body.senderMode,32); if (!['PLATFORM_DEFAULT','CUSTOM_DOMAIN'].includes(senderMode)) throw new BadRequestException('Invalid sender mode');
    let customDomainId:string|null=null;
    if (senderMode==='CUSTOM_DOMAIN') {
      const row=await this.db.tenantEmailDomain.findFirst({where:{id:String(body.customDomainId||''),tenantId,txVerified:true,status:'VERIFIED',purpose:{in:['TRANSACTIONAL','BOTH']}}});
      if (!row) throw new ForbiddenException('Domain is not verified for transactional mail');
      customDomainId=row.id;
    }
    const data={senderMode,customDomainId,senderName:clean(body.senderName,80),senderLocal:safeLocal(body.senderLocal||'siparis')};
    await this.db.tenantEmailSettings.upsert({where:{tenantId},create:{tenantId,...data},update:data});
    return this.settings(tenantId);
  }
  async addDomain(tenantId:string, body:any) {
    const domain=safeDomain(body.domain), purpose=clean(body.purpose||'TRANSACTIONAL',20);
    if (!['TRANSACTIONAL','MARKETING'].includes(purpose)) throw new BadRequestException('Invalid purpose');
    if (purpose==='MARKETING' && (!process.env.AWS_SES_MKT_PROVISIONER_ACCESS_KEY_ID || !process.env.AWS_SES_MKT_REGION)) throw new ServiceUnavailableException('Marketing provisioner is not configured');
    // Do not provision identities already assigned to another tenant or campaign.
    const existing=await this.db.tenantEmailDomain.findFirst({where:{domain}});
    if(existing)throw new BadRequestException('Domain is already registered');
    const ses=this.ses(purpose==='MARKETING'?'MKT':'TX',true);
    try {
      const result=await ses.send(new CreateEmailIdentityCommand({EmailIdentity:domain}));
      const mailFrom=`bounce.${domain}`,region=process.env[`AWS_SES_${purpose==='MARKETING'?'MKT':'TX'}_REGION`];
      await ses.send(new PutEmailIdentityMailFromAttributesCommand({EmailIdentity:domain,MailFromDomain:mailFrom,BehaviorOnMxFailure:'REJECT_MESSAGE'}));
      const records=[...(result.DkimAttributes?.Tokens||[]).map(token=>({type:'CNAME',name:`${token}._domainkey.${domain}`,value:`${token}.dkim.amazonses.com`})),
        {type:'MX',name:mailFrom,value:`10 feedback-smtp.${region}.amazonses.com`},
        {type:'TXT',name:mailFrom,value:'v=spf1 include:amazonses.com ~all'},
        {type:'TXT',name:`_dmarc.${domain}`,value:'v=DMARC1; p=none; rua=mailto:postmaster@'+domain}];
      return await this.db.tenantEmailDomain.create({data:{tenantId,domain,purpose,dnsRecords:records}});
    } catch (e:any) {
      if (e?.code==='P2002') throw new BadRequestException('Domain is already registered');
      throw new ServiceUnavailableException('Domain registration failed');
    }
  }
  async checkDomain(tenantId:string,id:string) {
    const row=await this.db.tenantEmailDomain.findFirst({where:{id,tenantId}}); if(!row)throw new NotFoundException();
    const scope=row.purpose==='MARKETING'?'MKT':'TX';
    try {
      const identity=await this.ses(scope,true).send(new GetEmailIdentityCommand({EmailIdentity:row.domain}));
      const dkim=identity.DkimAttributes?.Status==='SUCCESS';
      let dmarc=false; try {const txt=await resolveTxt(`_dmarc.${row.domain}`); dmarc=txt.some(parts=>/^v=DMARC1\s*;/i.test(parts.join('')));} catch {}
      const verified=identity.VerifiedForSendingStatus===true && dkim && identity.MailFromAttributes?.MailFromDomainStatus==='SUCCESS' && (scope==='TX'||dmarc);
      return this.db.tenantEmailDomain.update({where:{id},data:{status:verified?'VERIFIED':'PENDING_DNS',txVerified:scope==='TX'&&verified,mktVerified:scope==='MKT'&&verified,dmarcStatus:dmarc?'FOUND':'MISSING',lastCheckedAt:new Date(),verifiedAt:verified?new Date():null}});
    } catch { throw new ServiceUnavailableException('Domain verification could not be checked'); }
  }
  async removeDomain(tenantId:string,id:string) {
    const row=await this.db.tenantEmailDomain.findFirst({where:{id,tenantId}}); if(!row)throw new NotFoundException();
    const scheduled=await this.db.emailCampaign.findMany({where:{tenantId,domainId:id,status:'SCHEDULED'},select:{id:true},take:1000});
    await this.db.tenantEmailSettings.updateMany({where:{tenantId,customDomainId:id},data:{senderMode:'PLATFORM_DEFAULT',customDomainId:null}});
    await this.db.emailCampaign.updateMany({where:{tenantId,domainId:id,status:{in:['DRAFT','SCHEDULED']}},data:{status:'PAUSED'}});
    for(const campaign of scheduled) await this.cancelPendingJobs(tenantId,{campaignId:campaign.id});
    await this.db.tenantEmailDomain.delete({where:{id}}); return {ok:true,releasedCampaigns:scheduled.length};
  }
  async campaigns(tenantId:string) { return this.db.emailCampaign.findMany({where:{tenantId},orderBy:{createdAt:'desc'},take:50}); }
  private async cancelPendingJobs(tenantId:string,selector:{campaignId?:string,emailHash?:string}){
    return this.db.$transaction(async tx=>{
      const reserved=await tx.emailMarketingJob.findMany({where:{tenantId,status:'PENDING',creditReserved:true,...selector},select:{id:true}});
      let released=0;
      if(reserved.length){
        const changed=await tx.emailMarketingJob.updateMany({where:{id:{in:reserved.map(x=>x.id)},status:'PENDING',creditReserved:true},data:{status:'CANCELLED',creditReserved:false}});
        released=changed.count;
        if(released){const wallet=await tx.emailCreditWallet.findUnique({where:{tenantId}});if(wallet){await tx.$queryRaw`SELECT id FROM "EmailCreditWallet" WHERE id=${wallet.id} FOR UPDATE`;await tx.$executeRaw`UPDATE "EmailCreditWallet" SET "reserved"=GREATEST(0,"reserved"-${released}), "updatedAt"=NOW() WHERE id=${wallet.id}`;}}
      }
      const other=await tx.emailMarketingJob.updateMany({where:{tenantId,status:'PENDING',...selector},data:{status:'CANCELLED'}});
      return{cancelled:released+other.count,released};
    });
  }
  private async finishLeasedWithoutSend(job:{id:string;tenantId:string;creditReserved:boolean},status:'CANCELLED'|'FAILED'){
    return this.db.$transaction(async tx=>{
      if(job.creditReserved){
        const changed=await tx.emailMarketingJob.updateMany({where:{id:job.id,status:'LEASED',creditReserved:true},data:{status,lockedUntil:null,creditReserved:false}});
        if(changed.count){const wallet=await tx.emailCreditWallet.findUnique({where:{tenantId:job.tenantId}});if(wallet){await tx.$queryRaw`SELECT id FROM "EmailCreditWallet" WHERE id=${wallet.id} FOR UPDATE`;await tx.$executeRaw`UPDATE "EmailCreditWallet" SET "reserved"=GREATEST(0,"reserved"-1), "updatedAt"=NOW() WHERE id=${wallet.id}`;}return true;}
      }
      const changed=await tx.emailMarketingJob.updateMany({where:{id:job.id,status:'LEASED'},data:{status,lockedUntil:null}});return changed.count>0;
    });
  }
  async pauseCampaign(tenantId:string,id:string){
    const changed=await this.db.emailCampaign.updateMany({where:{id,tenantId,status:'SCHEDULED'},data:{status:'PAUSED'}});
    if(!changed.count)throw new NotFoundException('Active campaign not found');
    await this.cancelPendingJobs(tenantId,{campaignId:id});
    return {paused:true};
  }
  async campaignReport(tenantId:string,id:string) {
    const campaign=await this.db.emailCampaign.findFirst({where:{tenantId,id}});if(!campaign)throw new NotFoundException();
    const paid=campaign.scheduledAt?await this.db.order.findMany({where:{storeId:tenantId,paymentStatus:'PAID',createdAt:{gte:campaign.scheduledAt}},select:{id:true,customerId:true,discountCode:true,grandTotal:true,createdAt:true},orderBy:{createdAt:'asc'},take:5001}):[];
    const customerIds=[...new Set(paid.map(o=>o.customerId).filter((x):x is string=>!!x))];
    const clicks=customerIds.length?await this.db.emailMarketingJob.findMany({where:{tenantId,customerId:{in:customerIds},clickedAt:{gte:campaign.scheduledAt||undefined}},select:{customerId:true,campaignId:true,clickedAt:true},orderBy:{clickedAt:'desc'},take:20001}):[];
    const byCustomer=new Map<string,typeof clicks>();for(const click of clicks){const arr=byCustomer.get(click.customerId)||[];arr.push(click);byCustomer.set(click.customerId,arr);}
    const matches=paid.filter(o=>{
      if(campaign.attributionCode&&o.discountCode===campaign.attributionCode)return true;
      const last=o.customerId?byCustomer.get(o.customerId)?.find(c=>c.clickedAt&&c.clickedAt<=o.createdAt&&c.clickedAt>=new Date(o.createdAt.getTime()-7*86400000)):null;
      return last?.campaignId===id;
    });
    const subscription=await this.db.appBillingSubscription.findFirst({where:{tenantId,app:{slug:'email-marketing'}},orderBy:{createdAt:'desc'}});
    const revenue=matches.reduce((n,o)=>n+Number(o.grandTotal),0);
    const base=Number(subscription?.amount||0)/(subscription?.usageLimit||subscription?.includedUnits||1);
    const cost=campaign.sentCount*(base+Number(subscription?.usageUnitPrice||0));
    const clicked=await this.db.emailMarketingJob.count({where:{tenantId,campaignId:id,clickedAt:{not:null}}});
    return {campaignId:id,sent:campaign.sentCount,clicked,attributedOrders:matches.length,attributedRevenue:revenue,sendCost:cost,roi:cost>0?(revenue-cost)/cost:null,
      currency:subscription?.currency||'TRY',truncated:paid.length>5000||clicks.length>20000,attribution:'PROMOTION_CODE_OR_LAST_CLICK_7_DAYS',note:'Son tıklamadan sonraki 7 günde ödenen müşteri siparişi veya kampanyaya özel kod; tahmini paket maliyeti. Tıklama botları ve çevrimdışı satışlar sonucu etkileyebilir.'};
  }
  private async marketingAudienceIds(tenantId:string,audience:any){
    if(Array.isArray(audience?.customerIds))return Array.from(new Set(audience.customerIds.map((x:any)=>String(x)).filter(Boolean))).slice(0,50000);
    if(!audience?.segmentId)return null;
    const segment=await this.db.marketingSegment.findFirst({where:{id:String(audience.segmentId),storeId:tenantId,enabled:true}});if(!segment)return [];
    const rules:any=segment.rules||{};const where:any={storeId:tenantId,isActive:true,mergedIntoId:null};if(rules.groupId)where.groupId=String(rules.groupId);if(rules.acceptsMarketing!==undefined)where.acceptsMarketing=!!rules.acceptsMarketing;if(Array.isArray(rules.tagsAny)&&rules.tagsAny.length)where.tags={hasSome:rules.tagsAny.map(String)};if(rules.customerType)where.customerType=String(rules.customerType);if(rules.createdAfter||rules.createdBefore)where.createdAt={...(rules.createdAfter?{gte:new Date(rules.createdAfter)}:{}),...(rules.createdBefore?{lte:new Date(rules.createdBefore)}:{})};
    let ids=(await this.db.customer.findMany({where,select:{id:true},take:50000})).map(x=>x.id);
    if(ids.length&&(rules.minOrders||rules.minSpend||rules.lastOrderBefore||rules.lastOrderAfter)){const aggs:any[]=await (this.db.order.groupBy as any)({by:['customerId'],where:{storeId:tenantId,customerId:{in:ids},...(rules.lastOrderBefore||rules.lastOrderAfter?{createdAt:{...(rules.lastOrderAfter?{gte:new Date(rules.lastOrderAfter)}:{}),...(rules.lastOrderBefore?{lte:new Date(rules.lastOrderBefore)}:{})}}:{})},_count:{_all:true},_sum:{grandTotal:true}});const ok=new Set(aggs.filter((a:any)=>(!rules.minOrders||Number(a._count?._all||0)>=Number(rules.minOrders))&&(!rules.minSpend||Number(a._sum?.grandTotal||0)>=Number(rules.minSpend))).map((a:any)=>String(a.customerId)));ids=ids.filter(id=>ok.has(id));}
    return ids;
  }
  private campaignBlocksText(blocks:any){if(!Array.isArray(blocks))return '';return blocks.map((b:any)=>{const t=String(b?.type||'').toUpperCase(),c=b?.content&&typeof b.content==='object'?b.content:b;if(['TEXT','HEADING','HEADER','FOOTER'].includes(t))return String(c?.text||'');if(t==='BUTTON')return String(c?.text||'');if(t==='IMAGE')return String(c?.alt||'');if(t==='COLUMNS')return [c?.left,c?.right].filter(Boolean).join(' ');return ''}).filter(Boolean).join('\n\n').trim();}

  async saveCampaign(tenantId:string,body:any,id?:string) {
    const subject=clean(body.subject,150),headline=clean(body.headline,120),name=clean(body.name,100),blocks=Array.isArray(body.blocks)?body.blocks.slice(0,50):[];const bodyText=String(body.bodyText||this.campaignBlocksText(blocks)||'').trim();
    if(!subject||!headline||!name||!bodyText||bodyText.length>4000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(bodyText))throw new BadRequestException('Invalid template fields');
    const buttonUrl=body.buttonUrl?clean(body.buttonUrl,500):null;
    if(buttonUrl){
      const tenant=await this.db.tenant.findUnique({where:{id:tenantId},select:{domain:true,publicSlug:true}});
      try{const u=new URL(buttonUrl);if(u.protocol!=='https:'||u.username||u.password||u.port||!tenant||![tenant.domain,tenant.domain?`www.${tenant.domain}`:null,`${tenant.publicSlug}.ticarti.com`].includes(u.hostname.toLowerCase()))throw new Error();}
      catch{throw new BadRequestException('Button URL must use the store HTTPS domain');}
    }
    const attributionCode=body.attributionCode?clean(body.attributionCode,80):null;
    const data={name,subject,headline,bodyText,preheader:clean(body.preheader||'',160)||null,buttonText:clean(body.buttonText||'',80)||null,buttonUrl,attributionCode,
      senderLocal:safeLocal(body.senderLocal||'kampanya'),domainId:body.domainId?String(body.domainId):null,audience:body.audience&&typeof body.audience==='object'?body.audience:null,blocks,settings:body.settings&&typeof body.settings==='object'?body.settings:null};
    if (data.domainId && !await this.db.tenantEmailDomain.findFirst({where:{id:data.domainId,tenantId,purpose:'MARKETING'}}))throw new ForbiddenException('Invalid marketing domain');
    if (id) {
      const changed=await this.db.emailCampaign.updateMany({where:{id,tenantId,status:'DRAFT'},data});
      if(!changed.count)throw new NotFoundException('Editable draft not found');
      return this.db.emailCampaign.findUnique({where:{id}});
    }
    return this.db.emailCampaign.create({data:{tenantId,...data}});
  }
  private async billing(tenantId:string) {
    const row=await this.db.appBillingSubscription.findFirst({where:{tenantId,status:{in:['ACTIVE','TRIALING']},app:{slug:'email-marketing'},installation:{enabled:true,status:'ACTIVE'}},orderBy:{createdAt:'desc'}});
    if(!row || (row.trialEndsAt && row.trialEndsAt<new Date() && row.status==='TRIALING'))throw new ForbiddenException('Email marketing package is not active');
    return row;
  }
  async usage(tenantId:string) {
    const [subscription,wallet]=await Promise.all([this.billing(tenantId),this.db.emailCreditWallet.findUnique({where:{tenantId}})]);
    const beginning=new Date();beginning.setUTCDate(1);beginning.setUTCHours(0,0,0,0);
    const used=await this.db.emailMarketingJob.count({where:{tenantId,status:'SENT',sentAt:{gte:beginning}}});
    const limit=subscription.usageLimit||subscription.includedUnits;
    const reservedCredits=wallet?.reserved||0;const extraCredits=Math.max(0,(wallet?.balance||0)-reservedCredits);
    return {used,limit,extraCredits,reservedCredits,totalAvailable:Math.max(0,limit-used)+extraCredits,price:subscription.amount.toString(),currency:subscription.currency,period:dateKey()};
  }
  private async assertMarketing(tenantId:string) {
    if(!process.env.AWS_SES_MKT_ACCESS_KEY_ID||!process.env.AWS_SES_MKT_SECRET_ACCESS_KEY||!process.env.AWS_SES_MKT_SNS_TOPIC_ARN||
      process.env.AWS_SES_MKT_ACCESS_KEY_ID===process.env.AWS_SES_TX_ACCESS_KEY_ID)throw new ServiceUnavailableException('Isolated marketing credentials and SNS feedback are required');
    const [platform,policy,subscription]=await Promise.all([this.policy(),this.tenantPolicy(tenantId),this.billing(tenantId)]);
    if(platform?.marketingEnabled!==true || process.env.EMAIL_MARKETING_SEND_ENABLED!=='true')throw new ForbiddenException('Marketing is disabled at platform level');
    if(!policy?.enabled||policy.approvalStatus!=='APPROVED')throw new ForbiddenException('Tenant is not approved for email marketing');
    return subscription;
  }
  private async eligible(tenantId:string, customer:{id:string,email:string}) {
    const email=customer.email.toLowerCase().trim(); if(!emailPattern.test(email))return false;
    if(await this.db.emailSuppression.findUnique({where:{tenantId_scope_emailHash:{tenantId,scope:'MARKETING',emailHash:hash(email)}}}))return false;
    if(process.env.EMAIL_IYS_ENFORCEMENT==='required'){
      const iys=await this.db.emailIysConsent.findUnique({where:{tenantId_emailHash:{tenantId,emailHash:hash(email)}}});
      if(iys?.status!=='OPT_IN'||!iys.checkedAt||iys.checkedAt<new Date(Date.now()-7*86400000))return false;
    }
    const consent=await this.db.consentRecord.findFirst({where:{storeId:tenantId,email:{equals:email,mode:'insensitive'},type:'MARKETING_EMAIL'},orderBy:[{createdAt:'desc'},{id:'desc'}]});
    return consent?.granted===true;
  }
  async schedule(tenantId:string,id:string) {
    const subscription=await this.assertMarketing(tenantId);
    const campaign=await this.db.emailCampaign.findFirst({where:{id,tenantId,status:'DRAFT'}});if(!campaign)throw new NotFoundException('Draft not found');
    const domain=await this.db.tenantEmailDomain.findFirst({where:{id:campaign.domainId||'',tenantId,purpose:'MARKETING',status:'VERIFIED',mktVerified:true,dmarcStatus:'FOUND'}});
    if(!domain||domain.domain===PLATFORM_DOMAIN||domain.domain.endsWith('.'+PLATFORM_DOMAIN))throw new ForbiddenException('Verified marketing domain required');
    if (!process.env.AWS_SES_MKT_CONFIGURATION_SET || !process.env.EMAIL_PUBLIC_BASE_URL?.startsWith('https://') || String(process.env.EMAIL_UNSUBSCRIBE_SECRET||'').length<48) throw new ServiceUnavailableException('Marketing delivery safeguards are not configured');
    if(process.env.NODE_ENV==='production'&&process.env.EMAIL_IYS_ENFORCEMENT!=='required')throw new ServiceUnavailableException('IYS enforcement is required for marketing');
    // Fresh SES state is checked before any recipient is scheduled, never trust stale DB verification.
    const current=await this.checkDomain(tenantId,domain.id);if(!current.mktVerified)throw new ForbiddenException('Marketing domain verification expired');
    const limit=subscription.usageLimit||subscription.includedUnits;
    const month=new Date();month.setUTCDate(1);month.setUTCHours(0,0,0,0);
    const [used,wallet]=await Promise.all([this.db.emailMarketingJob.count({where:{tenantId,createdAt:{gte:month},status:{in:['PENDING','LEASED','SENT']}}}),this.db.emailCreditWallet.upsert({where:{tenantId},create:{tenantId,balance:0,lifetimePurchased:0,lifetimeUsed:0},update:{}})]);
    const remaining=Math.max(0,limit-used)+Math.max(0,(wallet.balance||0)-(wallet.reserved||0));
    if(remaining<=0)throw new ForbiddenException('Monthly allowance and email credits exhausted');
    const rawAudienceIds=await this.marketingAudienceIds(tenantId,campaign.audience||{});const audienceIds:string[]|null=Array.isArray(rawAudienceIds)?rawAudienceIds.map((value:any)=>String(value)).filter(Boolean):null;if(audienceIds&&!audienceIds.length)throw new BadRequestException('Campaign audience is empty');
    // Lock both subscription and credit wallet so concurrent campaigns cannot over-reserve allowance.
    return this.db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "AppBillingSubscription" WHERE id = ${subscription.id} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "EmailCreditWallet" WHERE id = ${wallet.id} FOR UPDATE`;
      const active=await tx.emailCampaign.updateMany({where:{id,tenantId,status:'DRAFT'},data:{status:'SCHEDULED',scheduledAt:new Date()}});
      if(!active.count)throw new ForbiddenException('Campaign already scheduled');
      const [actualUsed,lockedWallet]=await Promise.all([tx.emailMarketingJob.count({where:{tenantId,createdAt:{gte:month},status:{in:['PENDING','LEASED','SENT']}}}),tx.emailCreditWallet.findUnique({where:{id:wallet.id}})]);
      let monthlyRemaining=Math.max(0,limit-actualUsed);let creditRemaining=Math.max(0,(lockedWallet?.balance||0)-(lockedWallet?.reserved||0));let capacity=Math.min(monthlyRemaining+creditRemaining,5000);
      if(capacity<=0)throw new ForbiddenException('Monthly allowance and email credits exhausted');
      let cursor:string|undefined,queued=0,scanned=0;
      while(capacity>0 && scanned<10000){
        const rows=await tx.customer.findMany({where:{storeId:tenantId,isActive:true,...(audienceIds?{id:{in:audienceIds}}:{})},select:{id:true,email:true},orderBy:{id:'asc'},take:100,...(cursor?{cursor:{id:cursor},skip:1}:{})});
        if(!rows.length)break;
        cursor=rows[rows.length-1].id;
        scanned+=rows.length;
        const emails=rows.map(r=>r.email.trim().toLowerCase()).filter(e=>emailPattern.test(e));
        const [consents,suppressions,iysRows]=await Promise.all([
          tx.consentRecord.findMany({where:{storeId:tenantId,type:'MARKETING_EMAIL',email:{in:emails,mode:'insensitive'}},select:{email:true,granted:true},orderBy:[{createdAt:'desc'},{id:'desc'}]}),
          tx.emailSuppression.findMany({where:{tenantId,scope:'MARKETING',emailHash:{in:emails.map(hash)}},select:{emailHash:true}}),
          process.env.EMAIL_IYS_ENFORCEMENT==='required'?tx.emailIysConsent.findMany({where:{tenantId,emailHash:{in:emails.map(hash)},status:'OPT_IN',checkedAt:{gte:new Date(Date.now()-7*86400000)}},select:{emailHash:true}}):Promise.resolve([]),
        ]);
        const latest=new Map<string,boolean>();
        for(const consent of consents)if(consent.email&&!latest.has(consent.email.trim().toLowerCase()))latest.set(consent.email.trim().toLowerCase(),consent.granted);
        const suppressed=new Set(suppressions.map(s=>s.emailHash));
        const iysApproved=new Set(iysRows.map(s=>s.emailHash));
        const selected=[] as Array<{tenantId:string,campaignId:string,customerId:string,emailHash:string,creditReserved:boolean}>;let reservedAdded=0;
        for(const row of rows){
          const email=row.email.trim().toLowerCase();
          if(capacity<=0)break;
          if(latest.get(email)===true&&!suppressed.has(hash(email))&&(process.env.EMAIL_IYS_ENFORCEMENT!=='required'||iysApproved.has(hash(email)))){
            const creditReserved=monthlyRemaining<=0;
            if(creditReserved){if(creditRemaining<=0)break;creditRemaining--;reservedAdded++;}else monthlyRemaining--;
            selected.push({tenantId,campaignId:id,customerId:row.id,emailHash:hash(email),creditReserved});capacity--;
          }
        }
        if(selected.length){const result=await tx.emailMarketingJob.createMany({data:selected});queued+=result.count;if(reservedAdded)await tx.emailCreditWallet.update({where:{id:wallet.id},data:{reserved:{increment:reservedAdded}}});}
        if(rows.length<100)break;
      }
      return {queued,campaignId:id};
    },{timeout:120000});
  }
  private unsubscribeToken(tenantId:string,email:string) {
    const secret=String(process.env.EMAIL_UNSUBSCRIBE_SECRET||'');if(secret.length<48)throw new ServiceUnavailableException('Unsubscribe signing key missing');
    const payload=`${tenantId}.${hash(email)}.${Date.now()+90*86400000}`;
    const signature=createHmac('sha256',secret).update(payload).digest('hex');
    return Buffer.from(`${payload}.${signature}`).toString('base64url');
  }
  async unsubscribe(token:string){
    const secret=String(process.env.EMAIL_UNSUBSCRIBE_SECRET||'');if(secret.length<48)throw new ServiceUnavailableException('Unsubscribe signing key missing');
    if(!token||token.length>512)throw new BadRequestException('Invalid link');
    let parts:string[];try{parts=Buffer.from(token,'base64url').toString('utf8').split('.');}catch{throw new BadRequestException('Invalid link');}
    if(parts.length!==4 || !/^[a-f0-9]{64}$/.test(parts[1]) || Number(parts[2])<Date.now())throw new BadRequestException('Expired link');
    const payload=parts.slice(0,3).join('.');const expected=createHmac('sha256',secret).update(payload).digest();const supplied=Buffer.from(parts[3],'hex');
    if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))throw new BadRequestException('Invalid link');
    const [tenantId,emailHash]=parts;
    await this.db.emailSuppression.upsert({where:{tenantId_scope_emailHash:{tenantId,scope:'MARKETING',emailHash}},create:{tenantId,scope:'MARKETING',emailHash,reason:'UNSUBSCRIBE'},update:{reason:'UNSUBSCRIBE'}});
    await this.cancelPendingJobs(tenantId,{emailHash});
    return {ok:true};
  }
  private clickToken(jobId:string){
    const secret=String(process.env.EMAIL_UNSUBSCRIBE_SECRET||'');if(secret.length<48)throw new ServiceUnavailableException('Tracking key missing');
    const payload=`${jobId}.${Date.now()+30*86400000}`;
    return Buffer.from(`${payload}.${createHmac('sha256',secret).update(payload).digest('hex')}`).toString('base64url');
  }
  async recordClick(token:string){
    const secret=String(process.env.EMAIL_UNSUBSCRIBE_SECRET||'');if(secret.length<48)throw new ServiceUnavailableException('Tracking key missing');
    if(!token||token.length>512)throw new BadRequestException('Invalid click link');
    let parts:string[];try{parts=Buffer.from(token,'base64url').toString('utf8').split('.')}catch{throw new BadRequestException('Invalid click link')}
    if(parts.length!==3||!/^[a-f0-9-]{36}$/.test(parts[0])||!Number.isFinite(Number(parts[1]))||Number(parts[1])<Date.now())throw new BadRequestException('Expired click link');
    const sig=createHmac('sha256',secret).update(parts.slice(0,2).join('.')).digest(),given=Buffer.from(parts[2],'hex');
    if(sig.length!==given.length||!timingSafeEqual(sig,given))throw new BadRequestException('Invalid click link');
    const job=await this.db.emailMarketingJob.findFirst({where:{id:parts[0],status:'SENT'},include:{campaign:true}});if(!job?.campaign.buttonUrl)throw new NotFoundException();
    const updated=await this.db.emailMarketingJob.updateMany({where:{id:job.id,status:'SENT',clickedAt:null},data:{clickedAt:new Date()}});
    if(updated.count)await this.db.emailCampaign.update({where:{id:job.campaignId},data:{clickCount:{increment:1}}});
    return job.campaign.buttonUrl;
  }
  private html(c:{headline:string,bodyText:string,buttonText:string|null,buttonUrl:string|null,blocks?:any},link:string,buttonUrl:string|null,storeUrl:string){
    const safeColor=(v:any,fallback:string)=>/^#[0-9a-f]{6}$/i.test(String(v||''))?String(v):fallback;
    const align=(v:any)=>['left','center','right'].includes(String(v))?String(v):'left';
    const pad=(v:any)=>Math.max(0,Math.min(80,Number(v)||0));
    const blocks=Array.isArray(c.blocks)?c.blocks:[];let usedTracked=false;
    const rendered=blocks.map((b:any)=>{const t=String(b?.type||'').toUpperCase(),ct=b?.content&&typeof b.content==='object'?b.content:b,st=b?.settings&&typeof b.settings==='object'?b.settings:{};const style=`text-align:${align(st.align)};background:${safeColor(st.background,'#ffffff')};color:${safeColor(st.textColor,'#111827')};padding:${pad(st.padding??16)}px`;
      if(t==='HEADER')return `<div style="${style};font-size:24px;font-weight:700">${escape(String(ct.text||''))}</div>`;
      if(t==='TEXT'||t==='HEADING')return `<div style="${style};font-size:${t==='HEADING'?'22':'15'}px;line-height:1.6;white-space:pre-wrap">${escape(String(ct.text||''))}</div>`;
      if(t==='FOOTER')return `<div style="${style};font-size:12px">${escape(String(ct.text||''))}</div>`;
      if(t==='IMAGE'){const u=String(ct.url||'');if(!u.startsWith('https://'))return '';const raw=String(ct.linkUrl||'').trim();const href=raw.startsWith('/')?`${storeUrl}${raw}`:raw.startsWith('https://')?raw:'';const image=`<img src="${escape(u)}" alt="${escape(String(ct.alt||''))}" style="display:block;width:100%;max-width:100%;height:auto;border:0">`;return `<div style="background:${safeColor(st.background,'#ffffff')};padding:0">${href?`<a href="${escape(href)}" style="display:block">${image}</a>`:image}</div>`;}
      if(t==='COLUMNS')return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${style}"><tr><td width="50%" valign="top" style="padding-right:8px">${escape(String(ct.left||''))}</td><td width="50%" valign="top" style="padding-left:8px">${escape(String(ct.right||''))}</td></tr></table>`;
      if(t==='MENU'){const items=Array.isArray(ct.items)?ct.items:[];const menuStyle=String(ct.style||'SIMPLE').toUpperCase();const fontSize=Math.max(10,Math.min(28,Number(ct.fontSize)||14));const color=safeColor(st.textColor,'#111827');const sep=escape(String(ct.separator||' · ').slice(0,8));const itemCss=menuStyle==='PILLS'?`display:inline-block;padding:7px 12px;border-radius:999px;background:#f3f4f6;color:${color};text-decoration:none;font-weight:600`:menuStyle==='BORDERED'?`display:inline-block;padding:7px 12px;border:1px solid ${color};border-radius:6px;color:${color};text-decoration:none;font-weight:600`:menuStyle==='UNDERLINE'?`color:${color};text-decoration:underline;font-weight:600`:`color:${color};text-decoration:none;font-weight:600`;const resolved=items.map((it:any)=>{const type=String(it.type||'CUSTOM').toUpperCase();let href='';if(type==='CATEGORY'&&it.slug)href=`${storeUrl}/category/${encodeURIComponent(String(it.slug))}`;else if(type==='PAGE'&&it.slug)href=`${storeUrl}/pages/${encodeURIComponent(String(it.slug))}`;else {const raw=String(it.url||'').trim();href=raw.startsWith('/')?`${storeUrl}${raw}`:raw.startsWith('https://')?raw:'';}return href&&it.label?{href,label:String(it.label)}:null}).filter(Boolean) as Array<{href:string;label:string}>;if(menuStyle==='FULL_WIDTH'){const width=Math.max(1,Math.floor(100/Math.max(1,resolved.length)));const cells=resolved.map((it,index)=>`<td width="${width}%" align="center" valign="middle" style="${index?`border-left:1px solid #e5e7eb;`:''}padding:0"><a href="${escape(it.href)}" style="display:block;padding:10px 8px;color:${color};text-decoration:none;font-weight:600">${escape(it.label)}</a></td>`).join('');return cells?`<div style="${style};font-size:${fontSize}px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed"><tr>${cells}</tr></table></div>`:'';}const links=resolved.map(it=>`<a href="${escape(it.href)}" style="${itemCss}">${escape(it.label)}</a>`);const glue=menuStyle==='PILLS'||menuStyle==='BORDERED'?'&nbsp;':`<span style="opacity:.45">${sep}</span>`;return links.length?`<div style="${style};font-size:${fontSize}px;line-height:1.8">${links.join(glue)}</div>`:'';}
      if(t==='BUTTON'){const href=!usedTracked&&buttonUrl?(usedTracked=true,buttonUrl):null;return href?`<div style="${style}"><a href="${escape(href)}" style="display:inline-block;background:#1937a7;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">${escape(String(ct.text||c.buttonText||'İncele'))}</a></div>`:'';}
      if(t==='DIVIDER')return `<div style="padding:12px 16px"><hr style="border:0;border-top:1px solid #e5e7eb"></div>`;
      if(t==='SPACER')return `<div style="height:${Math.max(8,Math.min(160,Number(st.height)||24))}px"></div>`;return '';
    }).join('');
    const fallback=!rendered?`<h1>${escape(c.headline)}</h1>${escape(c.bodyText).split(/\r?\n/).map(x=>`<p>${x||'&nbsp;'}</p>`).join('')}${c.buttonText&&buttonUrl?`<p><a href="${escape(buttonUrl)}" style="background:#1937a7;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">${escape(c.buttonText)}</a></p>`:''}`:rendered;
    return `<!doctype html><html lang="tr"><meta charset="utf-8"><body style="margin:0;background:#f5f6f9;font-family:Arial,sans-serif"><main style="max-width:640px;margin:auto;padding:24px;background:#fff">${fallback}<hr><p style="font-size:12px;color:#666;padding:0 16px"><a href="${escape(link)}">E-posta aboneliğinden çık</a></p></main></body></html>`;
  }
  private async bill(job:{id:string,tenantId:string,creditReserved:boolean}) {
    const key=`email:${job.id}`;
    if(job.creditReserved){
      await this.db.$transaction(async tx=>{
        const wallet=await tx.emailCreditWallet.upsert({where:{tenantId:job.tenantId},create:{tenantId:job.tenantId,balance:0,lifetimePurchased:0,lifetimeUsed:0},update:{}});
        await tx.$queryRaw`SELECT id FROM "EmailCreditWallet" WHERE id=${wallet.id} FOR UPDATE`;
        const existing=await tx.emailCreditLedger.findFirst({where:{walletId:wallet.id,referenceId:job.id,type:'USAGE'}});
        if(existing){await tx.emailMarketingJob.update({where:{id:job.id},data:{billingStatus:'BILLED',creditReserved:false}});return;}
        const fresh=await tx.emailCreditWallet.findUnique({where:{id:wallet.id}});
        if(!fresh||fresh.balance<1||fresh.reserved<1)throw new ForbiddenException('Reserved email credit is unavailable');
        const updated=await tx.emailCreditWallet.update({where:{id:wallet.id},data:{balance:{decrement:1},reserved:{decrement:1},lifetimeUsed:{increment:1}}});
        await tx.emailCreditLedger.create({data:{walletId:wallet.id,amount:-1,type:'USAGE',source:'EMAIL_MARKETING',referenceId:job.id,description:'Pazarlama e-postası',balanceAfter:updated.balance}});
        await tx.emailMarketingJob.update({where:{id:job.id},data:{billingStatus:'BILLED',creditReserved:false}});
      });
      return;
    }
    const existing=await this.db.appUsageRecord.findUnique({where:{idempotencyKey:key}});
    if(!existing){
      const subscription=await this.billing(job.tenantId);
      await this.appBilling.reportUsage({installationId:subscription.installationId,tenantId:job.tenantId,appId:subscription.appId},{quantity:1,metric:'EMAIL_SENT',idempotencyKey:key});
    }
    await this.db.emailMarketingJob.update({where:{id:job.id},data:{billingStatus:'BILLED'}});
  }
  async processMarketing(limit=20){
    const take=Math.max(1,Math.min(Number(limit)||20,50));
    if((await this.policy())?.marketingEnabled!==true||process.env.EMAIL_MARKETING_SEND_ENABLED!=='true')return {processed:0,disabled:true};
    const missing=await this.db.emailMarketingJob.findMany({where:{status:'SENT',billingStatus:'PENDING'},take:take,orderBy:{sentAt:'asc'}});
    for(const row of missing)try{await this.bill(row)}catch{/* Retry accounting on next worker run; never send twice. */}
    const rows=await this.db.emailMarketingJob.findMany({where:{status:'PENDING',nextAttemptAt:{lte:new Date()}},take,orderBy:{createdAt:'asc'}});
    let processed=0;
    for(const row of rows){
      const lease=await this.db.emailMarketingJob.updateMany({where:{id:row.id,status:'PENDING'},data:{status:'LEASED',lockedUntil:new Date(Date.now()+120000),attempts:{increment:1}}});
      if(!lease.count)continue;
      let attemptedDelivery=false;
      try{
        await this.assertMarketing(row.tenantId);
        const [customer,campaign,store]=await Promise.all([this.db.customer.findFirst({where:{id:row.customerId,storeId:row.tenantId,isActive:true}}),this.db.emailCampaign.findFirst({where:{id:row.campaignId,tenantId:row.tenantId,status:'SCHEDULED'}}),this.db.tenant.findUnique({where:{id:row.tenantId},select:{domain:true,publicSlug:true,slug:true}})]);
        if(!customer||!campaign||hash(customer.email)!==row.emailHash||!await this.eligible(row.tenantId,customer)){
          await this.finishLeasedWithoutSend(row,'CANCELLED');continue;
        }
        const domain=await this.db.tenantEmailDomain.findFirst({where:{id:campaign.domainId||'',tenantId:row.tenantId,purpose:'MARKETING',status:'VERIFIED',mktVerified:true,dmarcStatus:'FOUND'}});
        if(!domain||domain.domain===PLATFORM_DOMAIN||domain.domain.endsWith('.'+PLATFORM_DOMAIN))throw new ForbiddenException('Domain no longer verified');
        const link=`${String(process.env.EMAIL_PUBLIC_BASE_URL||'').replace(/\/$/,'')}/v1/email/unsubscribe/${this.unsubscribeToken(row.tenantId,customer.email)}`;
        const trackedButton=campaign.buttonUrl?`${String(process.env.EMAIL_PUBLIC_BASE_URL||'').replace(/\/$/,'')}/v1/email/click/${this.clickToken(row.id)}`:null;
        if(!link.startsWith('https://'))throw new ServiceUnavailableException('Public email URL missing');
        const from=`${campaign.senderLocal}@${domain.domain}`;
        const boundary=`mail_${randomBytes(12).toString('hex')}`;
        const subject=Buffer.from(campaign.subject).toString('base64');
        const body=[`From: ${from}`,`To: ${safeAddress(customer.email)}`,`Subject: =?UTF-8?B?${subject}?=`,
          `MIME-Version: 1.0`,`List-Unsubscribe: <${link}>`,`List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
          `Content-Type: multipart/alternative; boundary="${boundary}"`,'',`--${boundary}`,'Content-Type: text/plain; charset=utf-8','',
          `${campaign.headline}\n\n${campaign.bodyText}${trackedButton?`\n\n${campaign.buttonText}: ${trackedButton}`:''}\n\nAbonelikten çık: ${link}`,`--${boundary}`,'Content-Type: text/html; charset=utf-8','',this.html(campaign,link,trackedButton,store?this.emailStoreUrl(store):''),`--${boundary}--`,''].join('\r\n');
        const sender=this.ses('MKT');attemptedDelivery=true;
        const result=await sender.send(new SendEmailCommand({FromEmailAddress:from,Destination:{ToAddresses:[customer.email]},
          Content:{Raw:{Data:Buffer.from(body)}},ConfigurationSetName:process.env.AWS_SES_MKT_CONFIGURATION_SET,
          EmailTags:[{Name:'campaign',Value:campaign.id},{Name:'tenant',Value:row.tenantId}]}));
        await this.db.$transaction([this.db.emailMarketingJob.update({where:{id:row.id},data:{status:'SENT',providerId:result.MessageId||null,sentAt:new Date(),lockedUntil:null}}),
          this.db.emailCampaign.update({where:{id:campaign.id},data:{sentCount:{increment:1}}})]); processed++;
        try{await this.bill(row)}catch{/* Accounting is retried separately; receipt is already SENT. */}
      } catch {
        // On a network timeout the SES outcome is unknown: do not risk duplicate mail.
        // LEASED jobs require provider-side reconciliation before an operator changes them.
        if(attemptedDelivery)continue;
        const attempts=row.attempts+1;
        if(attempts>=3) await this.finishLeasedWithoutSend(row,'FAILED');
        else await this.db.emailMarketingJob.updateMany({where:{id:row.id,status:'LEASED'},data:{status:'PENDING',lockedUntil:null,nextAttemptAt:new Date(Date.now()+Math.min(3600000,attempts*60000))}});
      }
    }
    return {processed};
  }
}
