'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  LoaderCircle,
  Mail,
  MessageCircle,
  MessageSquareText,
  Save,
  Send,
  ShieldCheck,
  Variable,
} from 'lucide-react';

import { useMasterSession } from '@/app/components/MasterSession';
import { Container } from '@/components/common/container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardHeading } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Toolbar, ToolbarActions, ToolbarDescription, ToolbarHeading } from '@/partials/common/toolbar';

type Locale={locale:string;label:string;flag?:string};
type TemplateText={subject?:string;body?:string};
type TemplateRow={event:string;name:string;enabled:boolean;layout?:string;metaName?:string;translations:Record<string,TemplateText>};
type CommunicationState={
  email:any;
  sms:any;
  whatsapp:any;
  activeLocales:Locale[];
  notificationRules:any[];
  templateVariables:any[];
  templates:{email:TemplateRow[];sms:TemplateRow[];whatsapp:TemplateRow[]};
};

const EMAIL_EVENTS=[
  ['WELCOME','Hoş Geldin','Ticarti’ye hoş geldiniz','Merhaba {{name}}, Ticarti hesabınız hazır.'],
  ['EMAIL_VERIFY','E-posta Doğrulama','E-posta adresinizi doğrulayın','Doğrulama bağlantınız: {{verification_url}}'],
  ['PASSWORD_RESET','Şifre Sıfırlama','Şifrenizi sıfırlayın','Şifre sıfırlama bağlantınız: {{reset_url}}'],
  ['SUBSCRIPTION_STARTED','Abonelik Başladı','Aboneliğiniz başladı','{{plan_name}} paketiniz aktif edildi.'],
  ['SUBSCRIPTION_CANCELLED','Abonelik İptal Edildi','Aboneliğiniz iptal edildi','Aboneliğiniz iptal edildi.'],
  ['PAYMENT_SUCCESS','Ödeme Başarılı','Ödemeniz alındı','Ödemeniz başarıyla alındı.'],
  ['PAYMENT_FAILED','Ödeme Başarısız','Ödemeniz alınamadı','Ödemeniz alınamadı. Tekrar deneyebilirsiniz.'],
  ['INVOICE_READY','Fatura Hazır','Faturanız hazır','Faturanızı {{invoice_url}} adresinden görüntüleyebilirsiniz.'],
  ['SUPPORT_CREATED','Destek Talebi Açıldı','Destek talebiniz alındı','{{ticket_number}} numaralı talebiniz oluşturuldu.'],
  ['SUPPORT_REPLIED','Destek Talebi Yanıtlandı','Destek talebiniz yanıtlandı','{{ticket_number}} numaralı talebiniz yanıtlandı.'],
] as const;

const SMS_EVENTS=[
  ['EMAIL_VERIFY','Doğrulama','', 'Doğrulama kodunuz: {{verification_code}}'],
  ['PASSWORD_RESET','Şifre Sıfırlama','', 'Şifre yenileme bağlantınız: {{reset_url}}'],
  ['PAYMENT_FAILED','Ödeme Başarısız','', 'Ödemeniz alınamadı. Hesabınızı kontrol edin.'],
  ['SUBSCRIPTION_STARTED','Abonelik Başladı','', '{{plan_name}} paketiniz aktif edildi.'],
] as const;

const WHATSAPP_EVENTS=[
  ['WELCOME','Hoş Geldin','', 'Merhaba {{name}}, Ticarti hesabınız hazır.'],
  ['PAYMENT_FAILED','Ödeme Başarısız','', 'Ödemeniz alınamadı. Hesabınızı kontrol edin.'],
  ['SUPPORT_REPLIED','Destek Yanıtı','', '{{ticket_number}} numaralı destek talebiniz yanıtlandı.'],
] as const;

function useCommunication(){
  const {request,restoring}=useMasterSession();
  const[data,setData]=useState<CommunicationState|null>(null);
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState('');
  const[err,setErr]=useState('');
  useEffect(()=>{if(restoring)return;void request('/superadmin/communication-settings').then(setData).catch((e:any)=>setErr(e.message||'Ayarlar alınamadı.'))},[request,restoring]);
  async function save(){
    if(!data)return;
    setBusy(true);setMsg('');setErr('');
    try{const next=await request('/superadmin/communication-settings',{method:'PATCH',body:JSON.stringify(data)});setData(next);setMsg('Ayarlar kaydedildi.');window.setTimeout(()=>setMsg(''),2200)}
    catch(e:any){setErr(e.message||'Kaydedilemedi.')}finally{setBusy(false)}
  }
  return{data,setData,busy,msg,err,save};
}

function Shell({title,description,icon:Icon,busy,msg,err,onSave,children}:{title:string;description:string;icon:any;busy:boolean;msg:string;err:string;onSave:()=>void;children:React.ReactNode}){
  return <>
    <Container><Toolbar><ToolbarHeading><div className="flex items-center gap-2"><Icon className="size-5 text-primary"/><h1 className="text-xl font-semibold text-mono">{title}</h1></div><ToolbarDescription>{description}</ToolbarDescription></ToolbarHeading><ToolbarActions><Button onClick={onSave} disabled={busy}>{busy?<LoaderCircle className="size-4 animate-spin"/>:<Save className="size-4"/>}Kaydet</Button></ToolbarActions></Toolbar></Container>
    {msg?<Container><div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"><CheckCircle2 className="size-4"/>{msg}</div></Container>:null}
    {err?<Container><div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{err}</div></Container>:null}
    <Container className="grid gap-5 pb-10">{children}</Container>
  </>;
}
function Box({title,description,children}:{title:string;description?:string;children:React.ReactNode}){return <Card><CardHeader><CardHeading>{title}</CardHeading>{description?<p className="mt-1 text-sm text-muted-foreground">{description}</p>:null}</CardHeader><CardContent className="grid gap-4">{children}</CardContent></Card>}
function Field({label,hint,children}:{label:string;hint?:string;children:React.ReactNode}){return <label className="grid gap-2"><span className="text-sm font-medium">{label}</span>{children}{hint?<span className="text-xs text-muted-foreground">{hint}</span>:null}</label>}
function Toggle({title,description,checked,onChange}:{title:string;description:string;checked:boolean;onChange:(v:boolean)=>void}){return <div className="flex items-center justify-between gap-5 rounded-lg border p-4"><div><div className="font-medium">{title}</div><div className="mt-1 text-sm text-muted-foreground">{description}</div></div><Switch checked={checked} onCheckedChange={onChange}/></div>}
function LocaleSelect({locales,value,onChange}:{locales:Locale[];value:string;onChange:(v:string)=>void}){return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder="Dil seçin"/></SelectTrigger><SelectContent>{locales.map(x=><SelectItem key={x.locale} value={x.locale}>{x.flag?x.flag+' ':''}{x.label}</SelectItem>)}</SelectContent></Select>}

function ensureTemplates(data:CommunicationState,channel:'email'|'sms'|'whatsapp'){
  const defs=channel==='email'?EMAIL_EVENTS:channel==='sms'?SMS_EVENTS:WHATSAPP_EVENTS;
  const current=Array.isArray(data.templates?.[channel])?data.templates[channel]:[];
  const locales=data.activeLocales.map(x=>x.locale);
  return defs.map(([event,name,subject,body])=>{
    const saved=current.find(x=>x.event===event);
    const translations:any={};
    for(const locale of locales){
      const existing=saved?.translations?.[locale];
      translations[locale]=existing||{subject,body};
    }
    return{event,name,enabled:saved?.enabled!==false,layout:saved?.layout||'minimal',metaName:saved?.metaName||'',translations};
  });
}

export function PlatformSesSettingsPage(){
  const s=useCommunication();if(!s.data)return <Loading/>;
  const v=s.data.email;
  const patch=(p:any)=>s.setData({...s.data!,email:{...v,...p}});
  return <Shell title="AWS SES Ayarları" description="Tüm Ticarti ve mağaza e-postalarının ortak gönderim altyapısı." icon={Send} busy={s.busy} msg={s.msg} err={s.err} onSave={s.save}>
    <Box title="Gönderim Altyapısı" description="Mağazalar kendi sender kimliğini yönetir; transport sağlayıcısı merkezi AWS SES'tir.">
      <Toggle title="AWS SES aktif" description="Kapalı olduğunda platform üzerinden e-posta gönderimi durdurulur." checked={v.enabled!==false} onChange={enabled=>patch({enabled})}/>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Provider"><Select value="AWS_SES" disabled><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="AWS_SES">AWS SES</SelectItem></SelectContent></Select></Field>
        <Field label="AWS Region"><Select value={v.region||'eu-central-1'} onValueChange={region=>patch({region})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['eu-central-1','eu-west-1','eu-west-2','eu-west-3','us-east-1','us-west-2'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Credential kaynağı" hint="Mevcut canlı kurulum ENVIRONMENT ise AWS anahtarlarına dokunulmaz."><Select value={v.credentialMode||'ENVIRONMENT'} onValueChange={credentialMode=>patch({credentialMode})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ENVIRONMENT">Cloud Run / Environment</SelectItem><SelectItem value="SECRET_MANAGER">Secret Manager</SelectItem></SelectContent></Select></Field>
        <Field label="Gönderim domaini"><Input value={v.senderDomain||''} onChange={e=>patch({senderDomain:e.target.value})}/></Field>
      </div>
    </Box>
    {v.credentialMode==='SECRET_MANAGER'?<Box title="Secret Manager" description="Secret değerleri gösterilmez; yalnızca secret isimleri saklanır."><div className="grid gap-4 md:grid-cols-2"><Field label="Access key secret"><Input value={v.accessKeySecretRef||''} onChange={e=>patch({accessKeySecretRef:e.target.value})}/></Field><Field label="Secret key secret"><Input value={v.secretKeySecretRef||''} onChange={e=>patch({secretKeySecretRef:e.target.value})}/></Field></div></Box>:null}
    <Box title="Platform Varsayılan Gönderici" description="Mağaza özel bir değer tanımlamazsa bu bilgiler kullanılır.">
      <div className="grid gap-4 md:grid-cols-2"><Field label="Gönderici adı"><Input value={v.defaultFromName||''} onChange={e=>patch({defaultFromName:e.target.value})}/></Field><Field label="Gönderici e-posta"><Input type="email" value={v.defaultFromEmail||''} onChange={e=>patch({defaultFromEmail:e.target.value})}/></Field><Field label="Reply-to"><Input type="email" value={v.defaultReplyTo||''} onChange={e=>patch({defaultReplyTo:e.target.value})}/></Field></div>
    </Box>
    <Box title="Mağaza Eşleştirmesi"><div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground"><b className="text-foreground">Gönderim sırası:</b> AWS SES (bu ekran) → mağaza E-posta Domain Ayarları → mağaza e-posta şablonu. Mağazanın fromName/fromEmail/replyTo değerleri varsa kullanılır; yoksa platform varsayılanları devreye girer. AWS credential bilgileri mağazaya verilmez.</div></Box>
  </Shell>;
}

export function PlatformEmailSettingsPage(){
  const s=useCommunication();if(!s.data)return <Loading/>;const v=s.data.email;const patch=(p:any)=>s.setData({...s.data!,email:{...v,...p}});
  return <Shell title="E-posta Ayarları" description="Ticarti sistem e-postalarının kanal ve teslim davranışları." icon={Mail} busy={s.busy} msg={s.msg} err={s.err} onSave={s.save}>
    <Box title="Kanal Ayarları"><Toggle title="E-posta kanalı" description="Ticarti sistem e-postalarını açar veya kapatır." checked={v.enabled!==false} onChange={enabled=>patch({enabled})}/><Toggle title="Transactional e-postalar" description="Kayıt, güvenlik, ödeme ve abonelik e-postalarını gönder." checked={v.transactional!==false} onChange={transactional=>patch({transactional})}/><Toggle title="Pazarlama e-postaları" description="İzinli Ticarti duyuru ve kampanya gönderimlerine izin ver." checked={v.marketing!==false} onChange={marketing=>patch({marketing})}/></Box>
    <Box title="Dil & Teslim Politikası"><div className="grid gap-4 md:grid-cols-2"><Field label="Varsayılan dil" hint="Yalnızca Dil Ayarları'nda aktif olan diller listelenir."><LocaleSelect locales={s.data.activeLocales} value={v.defaultLocale} onChange={defaultLocale=>patch({defaultLocale})}/></Field><Field label="Retry sayısı"><Select value={String(v.retryCount??3)} onValueChange={retryCount=>patch({retryCount:Number(retryCount)})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['0','1','2','3','4','5'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field></div><Toggle title="Bounce takibi" description="Hard bounce adreslerine tekrar gönderimi engelle." checked={v.bounceHandling!==false} onChange={bounceHandling=>patch({bounceHandling})}/><Toggle title="Complaint takibi" description="Şikayet alan adreslere otomatik gönderimi durdur." checked={v.complaintHandling!==false} onChange={complaintHandling=>patch({complaintHandling})}/></Box>
  </Shell>;
}

function TemplatesPage({channel}:{channel:'email'|'sms'|'whatsapp'}){
  const s=useCommunication();const[selected,setSelected]=useState('');const[locale,setLocale]=useState('');
  const data=s.data;
  const templates=useMemo(()=>data?ensureTemplates(data,channel):[],[data,channel]);
  useEffect(()=>{if(data&&!locale)setLocale(data.activeLocales.find(x=>x.locale===data.email.defaultLocale)?.locale||data.activeLocales[0]?.locale||'')},[data,locale]);
  useEffect(()=>{if(templates.length&&!selected)setSelected(templates[0].event)},[templates,selected]);
  if(!data)return <Loading/>;
  const current=templates.find(x=>x.event===selected)||templates[0];
  const persist=(nextRows:TemplateRow[])=>s.setData({...data,templates:{...data.templates,[channel]:nextRows}});
  const patch=(p:any)=>persist(templates.map(x=>x.event===current.event?{...x,...p}:x));
  const text=current?.translations?.[locale]||{subject:'',body:''};
  const patchText=(key:'subject'|'body',value:string)=>patch({translations:{...current.translations,[locale]:{...text,[key]:value}}});
  const title=channel==='email'?'E-posta Şablonları':channel==='sms'?'SMS Şablonları':'WhatsApp Şablonları';
  const Icon=channel==='email'?Mail:channel==='sms'?MessageSquareText:MessageCircle;
  return <Shell title={title} description="Şablon dilleri merkezi Dil Ayarları'ndan otomatik gelir." icon={Icon} busy={s.busy} msg={s.msg} err={s.err} onSave={()=>{persist(templates);void s.save()}}>
    <div className="grid gap-5 lg:grid-cols-[290px_1fr]">
      <Card><CardHeader><CardHeading>Şablonlar</CardHeading></CardHeader><CardContent className="grid gap-1 p-2">{templates.map(x=><button key={x.event} type="button" onClick={()=>setSelected(x.event)} className={'flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm '+(current?.event===x.event?'bg-muted font-medium':'hover:bg-muted/60')}><span>{x.name}</span>{x.enabled?<Badge appearance="light" variant="success">Aktif</Badge>:null}</button>)}</CardContent></Card>
      {current?<Box title={current.name}>
        <Toggle title="Şablon aktif" description="Bu olay için otomatik gönderime izin ver." checked={current.enabled!==false} onChange={enabled=>patch({enabled})}/>
        {channel==='email'?<Field label="Tasarım"><Select value={current.layout||'minimal'} onValueChange={layout=>patch({layout})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="minimal">Minimal</SelectItem><SelectItem value="brand">Marka</SelectItem><SelectItem value="editorial">Editoryal</SelectItem><SelectItem value="receipt">Fiş / İşlem</SelectItem></SelectContent></Select></Field>:null}
        {channel==='whatsapp'?<Field label="Meta template adı"><Input value={current.metaName||''} onChange={e=>patch({metaName:e.target.value})}/></Field>:null}
        <div className="flex flex-wrap gap-2 border-b pb-3">{data.activeLocales.map(x=><Button key={x.locale} type="button" size="sm" variant={locale===x.locale?'primary':'outline'} onClick={()=>setLocale(x.locale)}>{x.flag?x.flag+' ':''}{x.label}</Button>)}</div>
        {channel==='email'?<Field label={'Konu · '+(data.activeLocales.find(x=>x.locale===locale)?.label||locale)}><Input value={text.subject||''} onChange={e=>patchText('subject',e.target.value)}/></Field>:null}
        <Field label={(channel==='email'?'İçerik':'Mesaj')+' · '+(data.activeLocales.find(x=>x.locale===locale)?.label||locale)}><Textarea rows={channel==='email'?12:7} value={text.body||''} onChange={e=>patchText('body',e.target.value)}/></Field>
        <div className="flex flex-wrap gap-2">{data.templateVariables.filter(x=>x.enabled!==false).map(x=><Button key={x.key} type="button" size="sm" variant="outline" onClick={()=>patchText('body',(text.body||'')+((text.body||'')?' ':'')+x.key)}><code>{x.key}</code></Button>)}</div>
      </Box>:null}
    </div>
  </Shell>;
}
export function PlatformEmailTemplatesPage(){return <TemplatesPage channel="email"/>}
export function PlatformSmsTemplatesPage(){return <TemplatesPage channel="sms"/>}
export function PlatformWhatsappTemplatesPage(){return <TemplatesPage channel="whatsapp"/>}

export function PlatformSmsSettingsPage(){
  const s=useCommunication();if(!s.data)return <Loading/>;const v=s.data.sms;const patch=(p:any)=>s.setData({...s.data!,sms:{...v,...p}});
  return <Shell title="SMS Ayarları" description="Ticarti sistem SMS sağlayıcısı ve gönderici tanımları." icon={MessageSquareText} busy={s.busy} msg={s.msg} err={s.err} onSave={s.save}>
    <Box title="SMS Kanalı"><Toggle title="SMS aktif" description="Platform SMS gönderim kanalını etkinleştir." checked={v.enabled===true} onChange={enabled=>patch({enabled})}/><div className="grid gap-4 md:grid-cols-2"><Field label="Provider"><Select value={v.provider||'CUSTOM'} onValueChange={provider=>patch({provider})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="CUSTOM">Özel API</SelectItem><SelectItem value="NETGSM">Netgsm</SelectItem><SelectItem value="ILETIMERKEZI">İleti Merkezi</SelectItem><SelectItem value="TWILIO">Twilio</SelectItem></SelectContent></Select></Field><Field label="Sender ID"><Input value={v.senderId||''} onChange={e=>patch({senderId:e.target.value})}/></Field><Field label="API Base URL"><Input value={v.apiBaseUrl||''} onChange={e=>patch({apiBaseUrl:e.target.value})}/></Field><Field label="API key secret"><Input value={v.apiKeySecretRef||''} onChange={e=>patch({apiKeySecretRef:e.target.value})}/></Field><Field label="Varsayılan dil"><LocaleSelect locales={s.data.activeLocales} value={v.defaultLocale} onChange={defaultLocale=>patch({defaultLocale})}/></Field></div></Box>
  </Shell>;
}

export function PlatformWhatsappSettingsPage(){
  const s=useCommunication();if(!s.data)return <Loading/>;const v=s.data.whatsapp;const patch=(p:any)=>s.setData({...s.data!,whatsapp:{...v,...p}});
  return <Shell title="WhatsApp Ayarları" description="Ticarti WhatsApp Business bağlantı ayarları." icon={MessageCircle} busy={s.busy} msg={s.msg} err={s.err} onSave={s.save}>
    <Box title="WhatsApp Business"><Toggle title="WhatsApp aktif" description="Platform WhatsApp bildirim kanalını etkinleştir." checked={v.enabled===true} onChange={enabled=>patch({enabled})}/><div className="grid gap-4 md:grid-cols-2"><Field label="Provider"><Select value={v.provider||'META'} onValueChange={provider=>patch({provider})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="META">Meta WhatsApp Cloud API</SelectItem><SelectItem value="TWILIO">Twilio WhatsApp</SelectItem><SelectItem value="CUSTOM">Özel API</SelectItem></SelectContent></Select></Field><Field label="Varsayılan dil"><LocaleSelect locales={s.data.activeLocales} value={v.defaultLocale} onChange={defaultLocale=>patch({defaultLocale})}/></Field><Field label="Business Account ID"><Input value={v.businessAccountId||''} onChange={e=>patch({businessAccountId:e.target.value})}/></Field><Field label="Phone Number ID"><Input value={v.phoneNumberId||''} onChange={e=>patch({phoneNumberId:e.target.value})}/></Field><Field label="API Version"><Input value={v.apiVersion||''} onChange={e=>patch({apiVersion:e.target.value})}/></Field><Field label="Access token secret"><Input value={v.accessTokenSecretRef||''} onChange={e=>patch({accessTokenSecretRef:e.target.value})}/></Field><Field label="Webhook token secret"><Input value={v.webhookTokenSecretRef||''} onChange={e=>patch({webhookTokenSecretRef:e.target.value})}/></Field></div></Box>
  </Shell>;
}

export function PlatformNotificationRulesPage(){
  const s=useCommunication();if(!s.data)return <Loading/>;
  const patch=(i:number,p:any)=>s.setData({...s.data!,notificationRules:s.data!.notificationRules.map((x,n)=>n===i?{...x,...p}:x)});
  return <Shell title="Bildirim Kuralları" description="Sistem olaylarının hangi iletişim kanalından gönderileceğini yönetin." icon={ShieldCheck} busy={s.busy} msg={s.msg} err={s.err} onSave={s.save}>
    <Box title="Olay & Kanal Eşleştirmesi">{s.data.notificationRules.map((r,i)=><div key={r.event} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center"><div><div className="font-medium">{r.label}</div><div className="text-xs text-muted-foreground">{r.event}</div></div>{(['email','sms','whatsapp'] as const).map(k=><label key={k} className="flex items-center gap-2 text-sm"><Switch checked={!!r[k]} onCheckedChange={v=>patch(i,{[k]:v})}/>{k==='email'?'E-posta':k==='sms'?'SMS':'WhatsApp'}</label>)}<label className="flex items-center gap-2 text-sm"><Switch checked={r.enabled!==false} onCheckedChange={enabled=>patch(i,{enabled})}/>Aktif</label></div>)}</Box>
  </Shell>;
}

export function PlatformTemplateVariablesPage(){
  const s=useCommunication();if(!s.data)return <Loading/>;
  const patch=(i:number,p:any)=>s.setData({...s.data!,templateVariables:s.data!.templateVariables.map((x,n)=>n===i?{...x,...p}:x)});
  return <Shell title="Şablon Değişkenleri" description="E-posta, SMS ve WhatsApp şablonlarında kullanılabilecek merkezi değişkenler." icon={Variable} busy={s.busy} msg={s.msg} err={s.err} onSave={s.save}>
    <Box title="Değişkenler">{s.data.templateVariables.map((r,i)=><div key={r.key+'-'+i} className="grid gap-3 rounded-lg border p-4 lg:grid-cols-[180px_1fr_1fr_120px] lg:items-end"><Field label="Değişken"><Input value={r.key||''} onChange={e=>patch(i,{key:e.target.value})}/></Field><Field label="Açıklama"><Input value={r.label||''} onChange={e=>patch(i,{label:e.target.value})}/></Field><Field label="Kaynak"><Input value={r.source||''} onChange={e=>patch(i,{source:e.target.value})}/></Field><label className="flex h-10 items-center gap-2 text-sm"><Switch checked={r.enabled!==false} onCheckedChange={enabled=>patch(i,{enabled})}/>Aktif</label></div>)}</Box>
  </Shell>;
}

export function PlatformMessageTestPage(){
  const s=useCommunication();if(!s.data)return <Loading/>;
  return <Shell title="Kanal Durumu" description="Platform iletişim kanallarının merkezi yapılandırma durumunu kontrol edin." icon={Send} busy={s.busy} msg={s.msg} err={s.err} onSave={s.save}>
    <div className="grid gap-5 md:grid-cols-3">
      <StatusCard title="E-posta / AWS SES" enabled={s.data.email.enabled!==false} details={[s.data.email.region,s.data.email.senderDomain,s.data.email.defaultFromEmail]}/>
      <StatusCard title="SMS" enabled={s.data.sms.enabled===true} details={[s.data.sms.provider,s.data.sms.senderId]}/>
      <StatusCard title="WhatsApp" enabled={s.data.whatsapp.enabled===true} details={[s.data.whatsapp.provider,s.data.whatsapp.phoneNumberId]}/>
    </div>
    <Card><CardContent className="p-5 text-sm text-muted-foreground">Bu ekran gerçek mesaj göndermeden yapılandırma durumunu gösterir. Test gönderimi provider adapterları aktif olduğunda güvenli test endpointi üzerinden ayrıca bağlanmalıdır.</CardContent></Card>
  </Shell>;
}

function StatusCard({title,enabled,details}:{title:string;enabled:boolean;details:any[]}){return <Card><CardHeader><div className="flex items-center justify-between gap-3"><CardHeading>{title}</CardHeading><Badge appearance="light" variant={enabled?'success':'secondary'}>{enabled?'Aktif':'Pasif'}</Badge></div></CardHeader><CardContent className="grid gap-1 text-sm text-muted-foreground">{details.filter(Boolean).map((x,i)=><div key={i}>{String(x)}</div>)}</CardContent></Card>}
function Loading(){return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin"/></div>}
