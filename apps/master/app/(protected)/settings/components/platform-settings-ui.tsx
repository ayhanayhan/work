'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Braces,
  Building2,
  CheckCircle2,
  FileText,
  Globe2,
  Languages,
  Mail,
  MessageCircle,
  MessageSquareText,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Variable,
  WalletCards,
} from 'lucide-react';

import { Container } from '@/components/common/container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardHeading } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
} from '@/partials/common/toolbar';

type Json = Record<string, any>;

function useStoredSettings<T>(key: string, initial: T) {
  const storageKey = `ticarti-master-settings:${key}`;
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setValue(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, [storageKey]);

  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
      setMessage('Ayarlar kaydedildi.');
      window.setTimeout(() => setMessage(''), 2200);
    } catch {
      setMessage('Ayarlar kaydedilemedi.');
    }
  };

  return { value, setValue, ready, save, message };
}

function Shell({
  title,
  description,
  icon: Icon,
  onSave,
  message,
  children,
}: {
  title: string;
  description: string;
  icon?: any;
  onSave: () => void;
  message?: string;
  children: ReactNode;
}) {
  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <div className="flex items-center gap-2">
              {Icon ? <Icon className="size-5 text-primary" /> : null}
              <h1 className="text-xl font-semibold text-mono">{title}</h1>
            </div>
            <ToolbarDescription>{description}</ToolbarDescription>
          </ToolbarHeading>
          <ToolbarActions>
            <Button onClick={onSave}>
              <Save className="size-4" />
              Kaydet
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>
      {message ? (
        <Container>
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle2 className="size-4" />
            {message}
          </div>
        </Container>
      ) : null}
      <Container className="grid gap-5 pb-10">{children}</Container>
    </>
  );
}

function Box({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardHeading>{title}</CardHeading>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function Toggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-lg border p-4">
      <div>
        <div className="font-medium">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function setKey<T extends Json>(setValue: (next: T | ((prev: T) => T)) => void, key: string, next: any) {
  setValue((prev: T) => ({ ...prev, [key]: next }));
}

function DefinitionRows({
  rows,
  columns,
  onChange,
  onAdd,
  onRemove,
}: {
  rows: Json[];
  columns: Array<{ key: string; label: string; type?: 'text' | 'switch'; placeholder?: string }>;
  onChange: (index: number, key: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="grid gap-3">
      {rows.map((row, index) => (
        <div key={row.id || index} className="grid gap-3 rounded-lg border p-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          {columns.map((column) =>
            column.type === 'switch' ? (
              <div key={column.key} className="flex h-10 items-center gap-2">
                <Switch checked={!!row[column.key]} onCheckedChange={(v) => onChange(index, column.key, v)} />
                <span className="text-sm">{column.label}</span>
              </div>
            ) : (
              <Field key={column.key} label={column.label}>
                <Input
                  value={row[column.key] ?? ''}
                  placeholder={column.placeholder}
                  onChange={(e) => onChange(index, column.key, e.target.value)}
                />
              </Field>
            ),
          )}
          <Button variant="outline" size="icon" onClick={() => onRemove(index)} title="Sil">
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <div>
        <Button variant="outline" onClick={onAdd}>
          <Plus className="size-4" />
          Yeni ekle
        </Button>
      </div>
    </div>
  );
}

export function GeneralSettingsPage() {
  const initial = {
    platformName: 'Ticarti',
    companyName: 'Ticarti',
    supportEmail: 'support@ticarti.com',
    supportPhone: '',
    timezone: 'Europe/Istanbul',
    defaultLocale: 'tr-TR',
    websiteUrl: 'https://ticarti.com',
    loginUrl: 'https://login.ticarti.com',
    masterUrl: 'https://master.ticarti.com',
    developerUrl: 'https://devs.ticarti.com',
    maintenance: false,
  };
  const s = useStoredSettings('general', initial);
  const v = s.value;
  return (
    <Shell title="Genel Ayarlar" description="Ticarti platformunun kurumsal ve temel sistem tanımları." icon={Building2} onSave={s.save} message={s.message}>
      <Box title="Platform Kimliği">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Platform adı"><Input value={v.platformName} onChange={(e) => setKey(s.setValue, 'platformName', e.target.value)} /></Field>
          <Field label="Şirket / marka adı"><Input value={v.companyName} onChange={(e) => setKey(s.setValue, 'companyName', e.target.value)} /></Field>
          <Field label="Destek e-postası"><Input value={v.supportEmail} onChange={(e) => setKey(s.setValue, 'supportEmail', e.target.value)} /></Field>
          <Field label="Destek telefonu"><Input value={v.supportPhone} onChange={(e) => setKey(s.setValue, 'supportPhone', e.target.value)} /></Field>
        </div>
      </Box>
      <Box title="Bölgesel Varsayılanlar">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Saat dilimi"><Input value={v.timezone} onChange={(e) => setKey(s.setValue, 'timezone', e.target.value)} /></Field>
          <Field label="Varsayılan locale"><Input value={v.defaultLocale} onChange={(e) => setKey(s.setValue, 'defaultLocale', e.target.value)} /></Field>
        </div>
      </Box>
      <Box title="Platform URL'leri">
        <div className="grid gap-4 md:grid-cols-2">
          {(['websiteUrl','loginUrl','masterUrl','developerUrl'] as const).map((key) => (
            <Field key={key} label={key === 'websiteUrl' ? 'Web sitesi' : key === 'loginUrl' ? 'Giriş' : key === 'masterUrl' ? 'Master' : 'Developer'}>
              <Input value={v[key]} onChange={(e) => setKey(s.setValue, key, e.target.value)} />
            </Field>
          ))}
        </div>
      </Box>
      <Box title="Sistem Durumu">
        <Toggle title="Bakım modu" description="Ticarti platformu için genel bakım durumunu işaretler." checked={v.maintenance} onChange={(x) => setKey(s.setValue, 'maintenance', x)} />
      </Box>
    </Shell>
  );
}

function ListSettingsPage({
  storageKey,
  title,
  description,
  icon,
  initialRows,
  columns,
}: {
  storageKey: string;
  title: string;
  description: string;
  icon: any;
  initialRows: Json[];
  columns: Array<{ key: string; label: string; type?: 'text' | 'switch'; placeholder?: string }>;
}) {
  const s = useStoredSettings(storageKey, { rows: initialRows });
  const change = (index: number, key: string, value: any) =>
    s.setValue((prev) => ({ ...prev, rows: prev.rows.map((r, i) => i === index ? { ...r, [key]: value } : r) }));
  return (
    <Shell title={title} description={description} icon={icon} onSave={s.save} message={s.message}>
      <Box title={title}>
        <DefinitionRows
          rows={s.value.rows}
          columns={columns}
          onChange={change}
          onAdd={() => s.setValue((prev) => ({ ...prev, rows: [...prev.rows, { id: Date.now().toString(), active: true }] }))}
          onRemove={(index) => s.setValue((prev) => ({ ...prev, rows: prev.rows.filter((_, i) => i !== index) }))}
        />
      </Box>
    </Shell>
  );
}

export function LanguagesPage() {
  return <ListSettingsPage storageKey="languages" title="Dil Ayarları" description="Ticarti platformunda kullanılabilecek dilleri yönetin." icon={Languages}
    initialRows={[{id:'tr',name:'Türkçe',code:'tr-TR',nativeName:'Türkçe',active:true},{id:'en',name:'English',code:'en-US',nativeName:'English',active:true},{id:'bg',name:'Bulgarian',code:'bg-BG',nativeName:'Български',active:true}]}
    columns={[{key:'name',label:'Dil adı'},{key:'code',label:'Locale kodu'},{key:'nativeName',label:'Yerel ad'},{key:'active',label:'Aktif',type:'switch'}]} />;
}

export function CurrenciesPage() {
  return <ListSettingsPage storageKey="currencies" title="Para Birimleri" description="Desteklenen para birimleri ve gösterim formatlarını yönetin." icon={WalletCards}
    initialRows={[{id:'TRY',name:'Türk Lirası',code:'TRY',symbol:'₺',active:true},{id:'EUR',name:'Euro',code:'EUR',symbol:'€',active:true},{id:'USD',name:'US Dollar',code:'USD',symbol:'$',active:true},{id:'GBP',name:'British Pound',code:'GBP',symbol:'£',active:true}]}
    columns={[{key:'name',label:'Para birimi'},{key:'code',label:'Kod'},{key:'symbol',label:'Sembol'},{key:'active',label:'Aktif',type:'switch'}]} />;
}

export function CountriesPage() {
  return <ListSettingsPage storageKey="countries" title="Ülkeler" description="Kayıt ve iletişim formlarında kullanılacak ülke tanımlarını yönetin." icon={Globe2}
    initialRows={[{id:'TR',name:'Türkiye',iso:'TR',phone:'+90',active:true},{id:'DE',name:'Almanya',iso:'DE',phone:'+49',active:true},{id:'GB',name:'Birleşik Krallık',iso:'GB',phone:'+44',active:true}]}
    columns={[{key:'name',label:'Ülke'},{key:'iso',label:'ISO'},{key:'phone',label:'Telefon kodu'},{key:'active',label:'Aktif',type:'switch'}]} />;
}

export function ContractsPage() {
  const initial = { rows: [
    {id:'terms',name:'Kullanım Koşulları',slug:'terms-of-use',version:'1.0',required:true,active:true},
    {id:'privacy',name:'Gizlilik Politikası',slug:'privacy-policy',version:'1.0',required:true,active:true},
    {id:'kvkk',name:'KVKK Aydınlatma Metni',slug:'kvkk',version:'1.0',required:true,active:true},
  ]};
  const s = useStoredSettings('contracts', initial);
  const change=(i:number,k:string,val:any)=>s.setValue(p=>({...p,rows:p.rows.map((r,n)=>n===i?{...r,[k]:val}:r)}));
  return <Shell title="Sözleşme Tanımları" description="Ticarti kullanıcılarının onayladığı yasal metinleri versiyonlayın." icon={FileText} onSave={s.save} message={s.message}>
    <Box title="Sözleşmeler">
      <DefinitionRows rows={s.value.rows} columns={[{key:'name',label:'Sözleşme adı'},{key:'slug',label:'Anahtar / slug'},{key:'version',label:'Versiyon'},{key:'active',label:'Aktif',type:'switch'}]} onChange={change}
        onAdd={()=>s.setValue(p=>({...p,rows:[...p.rows,{id:Date.now().toString(),name:'Yeni Sözleşme',slug:'',version:'1.0',required:false,active:true}]}))}
        onRemove={(i)=>s.setValue(p=>({...p,rows:p.rows.filter((_,n)=>n!==i)}))}/>
    </Box>
    <Box title="Onay Politikası"><Toggle title="Yeni versiyonda yeniden onay iste" description="Zorunlu sözleşmelerin yeni versiyonu yayınlandığında kullanıcılardan tekrar onay istenir." checked={true} onChange={()=>{}} /></Box>
  </Shell>;
}

export function LegalIdentityPage() {
  const s=useStoredSettings('legal-identity',{companyTitle:'',taxOffice:'',taxNo:'',mersisNo:'',address:'',footerText:'© Ticarti'});
  const v=s.value;
  return <Shell title="Şirket & Yasal Kimlik" description="Ticarti'nin resmi şirket ve yasal iletişim bilgileri." icon={Building2} onSave={s.save} message={s.message}>
    <Box title="Şirket Bilgileri"><div className="grid gap-4 md:grid-cols-2">
      <Field label="Ticari unvan"><Input value={v.companyTitle} onChange={e=>setKey(s.setValue,'companyTitle',e.target.value)}/></Field>
      <Field label="Vergi dairesi"><Input value={v.taxOffice} onChange={e=>setKey(s.setValue,'taxOffice',e.target.value)}/></Field>
      <Field label="Vergi numarası"><Input value={v.taxNo} onChange={e=>setKey(s.setValue,'taxNo',e.target.value)}/></Field>
      <Field label="MERSİS"><Input value={v.mersisNo} onChange={e=>setKey(s.setValue,'mersisNo',e.target.value)}/></Field>
    </div><Field label="Adres"><Textarea value={v.address} onChange={e=>setKey(s.setValue,'address',e.target.value)}/></Field><Field label="Yasal footer"><Input value={v.footerText} onChange={e=>setKey(s.setValue,'footerText',e.target.value)}/></Field></Box>
  </Shell>;
}

export function SesSettingsPage() {
  const s=useStoredSettings('email-ses',{enabled:true,region:'eu-central-1',senderDomain:'ticarti.com',fromName:'Ticarti',fromEmail:'noreply@ticarti.com',replyTo:'support@ticarti.com',accessKeyRef:'ticarti-ses-tx-access-key-id',secretKeyRef:'ticarti-ses-tx-secret-access-key'});
  const v=s.value;
  return <Shell title="AWS SES Ayarları" description="Ticarti sistem e-postalarının AWS SES sağlayıcı yapılandırması." icon={Send} onSave={s.save} message={s.message}>
    <Box title="SES Bağlantısı"><Toggle title="AWS SES aktif" description="Sistem e-postalarını AWS SES üzerinden gönder." checked={v.enabled} onChange={x=>setKey(s.setValue,'enabled',x)}/>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="AWS region"><Input value={v.region} onChange={e=>setKey(s.setValue,'region',e.target.value)}/></Field>
        <Field label="Sender domain"><Input value={v.senderDomain} onChange={e=>setKey(s.setValue,'senderDomain',e.target.value)}/></Field>
        <Field label="From name"><Input value={v.fromName} onChange={e=>setKey(s.setValue,'fromName',e.target.value)}/></Field>
        <Field label="From email"><Input value={v.fromEmail} onChange={e=>setKey(s.setValue,'fromEmail',e.target.value)}/></Field>
        <Field label="Reply-to"><Input value={v.replyTo} onChange={e=>setKey(s.setValue,'replyTo',e.target.value)}/></Field>
      </div>
    </Box>
    <Box title="Secret Manager Referansları" description="Secret değerleri ekranda saklanmaz; yalnızca secret adları tutulur."><div className="grid gap-4 md:grid-cols-2">
      <Field label="Access key secret"><Input value={v.accessKeyRef} onChange={e=>setKey(s.setValue,'accessKeyRef',e.target.value)}/></Field>
      <Field label="Secret key secret"><Input value={v.secretKeyRef} onChange={e=>setKey(s.setValue,'secretKeyRef',e.target.value)}/></Field>
    </div></Box>
  </Shell>;
}

export function EmailSettingsPage() {
  const s=useStoredSettings('email',{enabled:true,transactional:true,marketing:false,defaultLocale:'tr-TR',bounceHandling:true,complaintHandling:true,retryCount:'3'});
  const v=s.value;
  return <Shell title="E-posta Ayarları" description="Ticarti'nin sistem e-posta davranışlarını yönetin." icon={Mail} onSave={s.save} message={s.message}>
    <Box title="Gönderim"><Toggle title="E-posta kanalı aktif" description="Ticarti sistem e-postalarının gönderilmesine izin ver." checked={v.enabled} onChange={x=>setKey(s.setValue,'enabled',x)}/>
      <Toggle title="Transactional e-postalar" description="Kayıt, doğrulama, güvenlik ve ödeme bildirimlerini gönder." checked={v.transactional} onChange={x=>setKey(s.setValue,'transactional',x)}/>
      <Toggle title="Pazarlama e-postaları" description="Ticarti kampanya ve duyurularını bu kanaldan göndermeye izin ver." checked={v.marketing} onChange={x=>setKey(s.setValue,'marketing',x)}/>
    </Box>
    <Box title="Teslim Politikası"><div className="grid gap-4 md:grid-cols-2"><Field label="Varsayılan dil"><Input value={v.defaultLocale} onChange={e=>setKey(s.setValue,'defaultLocale',e.target.value)}/></Field><Field label="Retry sayısı"><Input value={v.retryCount} onChange={e=>setKey(s.setValue,'retryCount',e.target.value)}/></Field></div>
      <Toggle title="Bounce takibi" description="Hard bounce adreslerini tekrar göndermeden önce engelle." checked={v.bounceHandling} onChange={x=>setKey(s.setValue,'bounceHandling',x)}/>
      <Toggle title="Complaint takibi" description="Şikayet alan adreslere otomatik gönderimi durdur." checked={v.complaintHandling} onChange={x=>setKey(s.setValue,'complaintHandling',x)}/>
    </Box>
  </Shell>;
}

const defaultEvents = [
  {id:'welcome',name:'Hoş Geldin',subject:'Ticarti’ye hoş geldiniz',body:'Merhaba {{name}}, Ticarti hesabınız hazır.',active:true},
  {id:'verify_email',name:'E-posta Doğrulama',subject:'E-posta adresinizi doğrulayın',body:'Doğrulama bağlantınız: {{verification_url}}',active:true},
  {id:'reset_password',name:'Şifre Sıfırlama',subject:'Şifrenizi sıfırlayın',body:'Şifre sıfırlama bağlantınız: {{reset_url}}',active:true},
  {id:'payment_failed',name:'Ödeme Başarısız',subject:'Ödemeniz alınamadı',body:'Merhaba {{name}}, abonelik ödemeniz alınamadı.',active:true},
];

function TemplatePage({channel}:{channel:'email'|'sms'|'whatsapp'}) {
  const s=useStoredSettings(`${channel}-templates`,{templates:defaultEvents.map(x=>({...x,metaName:channel==='whatsapp'?x.id+'_tr':''}))});
  const [selected,setSelected]=useState(defaultEvents[0].id);
  const rows=s.value.templates;
  const current=rows.find(x=>x.id===selected)||rows[0];
  const patch=(next:Json)=>s.setValue(p=>({...p,templates:p.templates.map(x=>x.id===current.id?{...x,...next}:x)}));
  const title=channel==='email'?'E-posta Şablonları':channel==='sms'?'SMS Şablonları':'WhatsApp Şablonları';
  return <Shell title={title} description="Ticarti sistem olaylarında kullanılacak merkezi mesaj şablonları." icon={channel==='email'?Mail:channel==='sms'?MessageSquareText:MessageCircle} onSave={s.save} message={s.message}>
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <Card><CardHeader><CardHeading>Şablonlar</CardHeading></CardHeader><CardContent className="grid gap-1 p-2">{rows.map(x=><button key={x.id} onClick={()=>setSelected(x.id)} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${selected===x.id?'bg-muted font-medium':'hover:bg-muted/60'}`}><span>{x.name}</span>{x.active?<Badge appearance="light" variant="success">Aktif</Badge>:null}</button>)}</CardContent></Card>
      <Box title={current.name}><Toggle title="Şablon aktif" description="Bu olay için otomatik gönderime izin ver." checked={current.active} onChange={x=>patch({active:x})}/>
        {channel==='email'?<Field label="Konu"><Input value={current.subject} onChange={e=>patch({subject:e.target.value})}/></Field>:null}
        {channel==='whatsapp'?<Field label="Meta template adı"><Input value={current.metaName} onChange={e=>patch({metaName:e.target.value})}/></Field>:null}
        <Field label={channel==='email'?'İçerik':'Mesaj'}><Textarea rows={channel==='email'?12:7} value={current.body} onChange={e=>patch({body:e.target.value})}/></Field>
        <div className="flex flex-wrap gap-2">{['{{name}}','{{email}}','{{verification_url}}','{{reset_url}}','{{plan_name}}','{{payment_url}}'].map(x=><button key={x} onClick={()=>patch({body:`${current.body} ${x}`})} className="rounded-md bg-muted px-2 py-1 font-mono text-xs">{x}</button>)}</div>
      </Box>
    </div>
  </Shell>;
}
export function EmailTemplatesPage(){return <TemplatePage channel="email"/>}
export function SmsTemplatesPage(){return <TemplatePage channel="sms"/>}
export function WhatsappTemplatesPage(){return <TemplatePage channel="whatsapp"/>}

function ProviderPage({channel}:{channel:'sms'|'whatsapp'}) {
  const title=channel==='sms'?'SMS Ayarları':'WhatsApp Ayarları';
  const initial=channel==='sms'
    ? {enabled:true,provider:'generic',senderId:'TICARTI',apiBase:'',apiKeyRef:'ticarti-sms-api-key',defaultCountry:'TR'}
    : {enabled:true,provider:'meta',businessAccountId:'',phoneNumberId:'',webhookTokenRef:'ticarti-whatsapp-webhook-token',accessTokenRef:'ticarti-whatsapp-access-token',apiVersion:'v21.0'};
  const s=useStoredSettings(channel,initial as Json); const v=s.value as Json;
  return <Shell title={title} description={channel==='sms'?'Ticarti SMS sağlayıcısı ve gönderici ayarları.':'Meta WhatsApp Business bağlantı ve webhook ayarları.'} icon={channel==='sms'?MessageSquareText:MessageCircle} onSave={s.save} message={s.message}>
    <Box title="Kanal"><Toggle title={channel==='sms'?'SMS aktif':'WhatsApp aktif'} description="Bu iletişim kanalını sistem genelinde kullan." checked={!!v.enabled} onChange={x=>setKey(s.setValue,'enabled',x)}/>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Provider"><Input value={v.provider||''} onChange={e=>setKey(s.setValue,'provider',e.target.value)}/></Field>
        {channel==='sms'?<><Field label="Sender ID"><Input value={v.senderId||''} onChange={e=>setKey(s.setValue,'senderId',e.target.value)}/></Field><Field label="API base URL"><Input value={v.apiBase||''} onChange={e=>setKey(s.setValue,'apiBase',e.target.value)}/></Field><Field label="API key secret"><Input value={v.apiKeyRef||''} onChange={e=>setKey(s.setValue,'apiKeyRef',e.target.value)}/></Field></>:<><Field label="Business Account ID"><Input value={v.businessAccountId||''} onChange={e=>setKey(s.setValue,'businessAccountId',e.target.value)}/></Field><Field label="Phone Number ID"><Input value={v.phoneNumberId||''} onChange={e=>setKey(s.setValue,'phoneNumberId',e.target.value)}/></Field><Field label="API version"><Input value={v.apiVersion||''} onChange={e=>setKey(s.setValue,'apiVersion',e.target.value)}/></Field><Field label="Access token secret"><Input value={v.accessTokenRef||''} onChange={e=>setKey(s.setValue,'accessTokenRef',e.target.value)}/></Field><Field label="Webhook token secret"><Input value={v.webhookTokenRef||''} onChange={e=>setKey(s.setValue,'webhookTokenRef',e.target.value)}/></Field></>}
      </div>
    </Box>
  </Shell>;
}
export function SmsSettingsPage(){return <ProviderPage channel="sms"/>}
export function WhatsappSettingsPage(){return <ProviderPage channel="whatsapp"/>}

export function NotificationRulesPage() {
  const initial={rules:[
    {id:'user_registered',event:'Yeni kullanıcı kaydı',email:true,sms:false,whatsapp:false,active:true},
    {id:'email_verify',event:'E-posta doğrulama',email:true,sms:false,whatsapp:false,active:true},
    {id:'password_reset',event:'Şifre sıfırlama',email:true,sms:true,whatsapp:false,active:true},
    {id:'payment_failed',event:'Ödeme başarısız',email:true,sms:false,whatsapp:true,active:true},
  ]};
  const s=useStoredSettings('notification-rules',initial);
  const patch=(i:number,k:string,v:any)=>s.setValue(p=>({...p,rules:p.rules.map((x,n)=>n===i?{...x,[k]:v}:x)}));
  return <Shell title="Bildirim Kuralları" description="Sistem olaylarının hangi kanallardan gönderileceğini belirleyin." icon={ShieldCheck} onSave={s.save} message={s.message}>
    <Box title="Olay & Kanal Eşleştirmeleri">{s.value.rules.map((r,i)=><div key={r.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center"><div><div className="font-medium">{r.event}</div><div className="text-xs text-muted-foreground">{r.id}</div></div>{(['email','sms','whatsapp'] as const).map(k=><label key={k} className="flex items-center gap-2 text-sm"><Switch checked={r[k]} onCheckedChange={v=>patch(i,k,v)}/>{k==='email'?'E-posta':k==='sms'?'SMS':'WhatsApp'}</label>)}<label className="flex items-center gap-2 text-sm"><Switch checked={r.active} onCheckedChange={v=>patch(i,'active',v)}/>Aktif</label></div>)}</Box>
  </Shell>;
}

export function TemplateVariablesPage() {
  return <ListSettingsPage storageKey="template-variables" title="Şablon Değişkenleri" description="İletişim şablonlarında kullanılabilecek sistem değişkenleri." icon={Variable}
    initialRows={[{id:'name',key:'{{name}}',label:'Kullanıcı adı',source:'user.name',active:true},{id:'email',key:'{{email}}',label:'E-posta',source:'user.email',active:true},{id:'plan',key:'{{plan_name}}',label:'Paket adı',source:'subscription.plan.name',active:true}]}
    columns={[{key:'key',label:'Değişken'},{key:'label',label:'Açıklama'},{key:'source',label:'Kaynak alan'},{key:'active',label:'Aktif',type:'switch'}]} />;
}

export function MessageTestPage() {
  const s=useStoredSettings('message-test',{channel:'email',recipient:'',template:'welcome',payload:'{"name":"Ayhan"}'});
  const [result,setResult]=useState('');
  const v=s.value;
  return <Shell title="Test Merkezi" description="Tanımlı iletişim kanallarını gerçek gönderim bağlamadan test edin." icon={Send} onSave={s.save} message={s.message}>
    <Box title="Test Mesajı"><div className="grid gap-4 md:grid-cols-3"><Field label="Kanal"><Select value={v.channel} onValueChange={x=>setKey(s.setValue,'channel',x)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="email">E-posta</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent></Select></Field><Field label="Alıcı"><Input value={v.recipient} onChange={e=>setKey(s.setValue,'recipient',e.target.value)}/></Field><Field label="Şablon"><Input value={v.template} onChange={e=>setKey(s.setValue,'template',e.target.value)}/></Field></div><Field label="Örnek veri"><Textarea value={v.payload} onChange={e=>setKey(s.setValue,'payload',e.target.value)}/></Field><div><Button variant="outline" onClick={()=>setResult('Test isteği hazırlandı. Gerçek provider bağlantısı eklendiğinde buradan gönderilecek.')}><Send className="size-4"/>Test gönder</Button></div>{result?<div className="rounded-lg border bg-muted/30 p-3 text-sm">{result}</div>:null}</Box>
  </Shell>;
}

export function AiSettingsPage() {
  const s=useStoredSettings('ai',{enabled:true,provider:'openai',defaultModel:'gpt-5.6',apiKeyRef:'ticarti-ai-api-key',baseUrl:'',temperature:'0.4',maxTokens:'4096',logging:true,redactPii:true});
  const v=s.value;
  return <Shell title="AI Ayarları" description="TicAi ve platform genelindeki yapay zeka servislerinin ana yapılandırması." icon={Bot} onSave={s.save} message={s.message}>
    <Box title="Provider & Model"><Toggle title="AI özellikleri aktif" description="TicAi ve AI destekli özellikleri platform genelinde etkinleştir." checked={v.enabled} onChange={x=>setKey(s.setValue,'enabled',x)}/><div className="grid gap-4 md:grid-cols-2"><Field label="Provider"><Select value={v.provider} onValueChange={x=>setKey(s.setValue,'provider',x)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="openai">OpenAI</SelectItem><SelectItem value="anthropic">Anthropic</SelectItem><SelectItem value="google">Google</SelectItem><SelectItem value="custom">Özel endpoint</SelectItem></SelectContent></Select></Field><Field label="Varsayılan model"><Input value={v.defaultModel} onChange={e=>setKey(s.setValue,'defaultModel',e.target.value)}/></Field><Field label="API key secret"><Input value={v.apiKeyRef} onChange={e=>setKey(s.setValue,'apiKeyRef',e.target.value)}/></Field><Field label="Özel base URL"><Input value={v.baseUrl} onChange={e=>setKey(s.setValue,'baseUrl',e.target.value)}/></Field></div></Box>
    <Box title="Varsayılan Üretim Ayarları"><div className="grid gap-4 md:grid-cols-2"><Field label="Temperature"><Input value={v.temperature} onChange={e=>setKey(s.setValue,'temperature',e.target.value)}/></Field><Field label="Maksimum token"><Input value={v.maxTokens} onChange={e=>setKey(s.setValue,'maxTokens',e.target.value)}/></Field></div><Toggle title="AI loglama" description="İstek metadatasını denetim ve maliyet analizi için kaydet." checked={v.logging} onChange={x=>setKey(s.setValue,'logging',x)}/><Toggle title="Kişisel veriyi maskele" description="Modele gönderilmeden önce desteklenen PII alanlarını maskele." checked={v.redactPii} onChange={x=>setKey(s.setValue,'redactPii',x)}/></Box>
  </Shell>;
}

export function AiModelsPage() {
  return <ListSettingsPage storageKey="ai-models" title="Model Tanımları" description="TicAi tarafından kullanılabilecek modelleri ve görev profilini yönetin." icon={Braces}
    initialRows={[{id:'default',name:'GPT 5.6',model:'gpt-5.6',task:'Genel',active:true},{id:'fast',name:'GPT 5.6 Fast',model:'gpt-5.6-luna',task:'Hızlı görevler',active:true}]}
    columns={[{key:'name',label:'Görünen ad'},{key:'model',label:'Model ID'},{key:'task',label:'Görev profili'},{key:'active',label:'Aktif',type:'switch'}]} />;
}

export function AiPoliciesPage() {
  const s=useStoredSettings('ai-policies',{dailyUserLimit:'100',monthlyPlatformLimit:'1000000',allowContent:true,allowSupport:true,allowMarketing:true,allowCode:false,retainDays:'30',moderation:true});
  const v=s.value;
  return <Shell title="AI Kullanım Politikaları" description="Kota, erişim, kayıt ve güvenlik kurallarını tanımlayın." icon={ShieldCheck} onSave={s.save} message={s.message}>
    <Box title="Kotalar"><div className="grid gap-4 md:grid-cols-3"><Field label="Kullanıcı / gün"><Input value={v.dailyUserLimit} onChange={e=>setKey(s.setValue,'dailyUserLimit',e.target.value)}/></Field><Field label="Platform / ay token"><Input value={v.monthlyPlatformLimit} onChange={e=>setKey(s.setValue,'monthlyPlatformLimit',e.target.value)}/></Field><Field label="Log saklama (gün)"><Input value={v.retainDays} onChange={e=>setKey(s.setValue,'retainDays',e.target.value)}/></Field></div></Box>
    <Box title="Özellik Erişimi"><Toggle title="İçerik üretimi" description="Metin ve içerik üretimi özelliklerine izin ver." checked={v.allowContent} onChange={x=>setKey(s.setValue,'allowContent',x)}/><Toggle title="Destek asistanı" description="Destek süreçlerinde AI kullanımına izin ver." checked={v.allowSupport} onChange={x=>setKey(s.setValue,'allowSupport',x)}/><Toggle title="Pazarlama" description="Pazarlama metni ve kampanya üretiminde AI kullanımına izin ver." checked={v.allowMarketing} onChange={x=>setKey(s.setValue,'allowMarketing',x)}/><Toggle title="Kod üretimi" description="Yönetim panelinden kod üretimine izin ver." checked={v.allowCode} onChange={x=>setKey(s.setValue,'allowCode',x)}/><Toggle title="Moderasyon" description="AI isteklerini güvenlik/moderasyon katmanından geçir." checked={v.moderation} onChange={x=>setKey(s.setValue,'moderation',x)}/></Box>
  </Shell>;
}
