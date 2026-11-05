'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Globe2,
  Languages,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  Upload,
  WalletCards,
} from 'lucide-react';

import { useMasterSession } from '@/app/components/MasterSession';
import { Container } from '@/components/common/container';
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

type PlatformLocale = {
  locale: string;
  label: string;
  flag?: string;
  isActive: boolean;
  isDefault: boolean;
  sortOrder?: number;
};

type PlatformCurrency = {
  code: string;
  name: string;
  symbol: string;
  symbolPosition?: 'BEFORE' | 'AFTER';
  isActive: boolean;
  isDefault: boolean;
  sortOrder?: number;
};

type PlatformCountry = {
  code: string;
  name: string;
  phoneCode: string;
  flag?: string;
  isActive: boolean;
  sortOrder?: number;
};

type PlatformCompany = {
  name?: string;
  legalName?: string;
  email?: string;
  phone?: string;
  website?: string;
  taxOffice?: string;
  taxNumber?: string;
  address?: string;
  country?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  phoneCountry?: string;
  timezone?: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  faviconUrl?: string;
  socialLinks?: Array<{ platform: string; url: string }>;
};

type PlatformSettings = {
  company: PlatformCompany;
  locales: PlatformLocale[];
  currencies: PlatformCurrency[];
  countries: PlatformCountry[];
};

const LANGUAGE_CATALOG = [
  ['tr', 'Türkçe', '🇹🇷'],
  ['en', 'English', '🇬🇧'],
  ['de', 'Deutsch', '🇩🇪'],
  ['fr', 'Français', '🇫🇷'],
  ['es', 'Español', '🇪🇸'],
  ['it', 'Italiano', '🇮🇹'],
  ['pt', 'Português', '🇵🇹'],
  ['nl', 'Nederlands', '🇳🇱'],
  ['bg', 'Български', '🇧🇬'],
  ['ro', 'Română', '🇷🇴'],
  ['ru', 'Русский', '🇷🇺'],
  ['uk', 'Українська', '🇺🇦'],
  ['pl', 'Polski', '🇵🇱'],
  ['cs', 'Čeština', '🇨🇿'],
  ['sk', 'Slovenčina', '🇸🇰'],
  ['hu', 'Magyar', '🇭🇺'],
  ['el', 'Ελληνικά', '🇬🇷'],
  ['sv', 'Svenska', '🇸🇪'],
  ['no', 'Norsk', '🇳🇴'],
  ['da', 'Dansk', '🇩🇰'],
  ['fi', 'Suomi', '🇫🇮'],
  ['sr', 'Srpski', '🇷🇸'],
  ['hr', 'Hrvatski', '🇭🇷'],
  ['bs', 'Bosanski', '🇧🇦'],
  ['sq', 'Shqip', '🇦🇱'],
  ['sl', 'Slovenščina', '🇸🇮'],
  ['mk', 'Македонски', '🇲🇰'],
  ['et', 'Eesti', '🇪🇪'],
  ['lv', 'Latviešu', '🇱🇻'],
  ['lt', 'Lietuvių', '🇱🇹'],
  ['az', 'Azərbaycan dili', '🇦🇿'],
  ['ka', 'ქართული', '🇬🇪'],
  ['hy', 'Հայերեն', '🇦🇲'],
  ['uz', 'O‘zbekcha', '🇺🇿'],
  ['kk', 'Қазақша', '🇰🇿'],
  ['ky', 'Кыргызча', '🇰🇬'],
  ['tk', 'Türkmençe', '🇹🇲'],
  ['ar', 'العربية', '🇸🇦'],
  ['he', 'עברית', '🇮🇱'],
  ['fa', 'فارسی', '🇮🇷'],
  ['ur', 'اردو', '🇵🇰'],
  ['hi', 'हिन्दी', '🇮🇳'],
  ['zh', '中文', '🇨🇳'],
  ['ja', '日本語', '🇯🇵'],
  ['ko', '한국어', '🇰🇷'],
  ['id', 'Bahasa Indonesia', '🇮🇩'],
  ['ms', 'Bahasa Melayu', '🇲🇾'],
  ['vi', 'Tiếng Việt', '🇻🇳'],
  ['th', 'ไทย', '🇹🇭'],
] as const;

const CURRENCY_CATALOG = [
  ['TRY', 'Türk Lirası', '₺', 'BEFORE'],
  ['USD', 'US Dollar', '$', 'BEFORE'],
  ['EUR', 'Euro', '€', 'AFTER'],
  ['GBP', 'British Pound', '£', 'BEFORE'],
  ['BGN', 'Bulgar Levası', 'лв', 'AFTER'],
  ['RON', 'Rumen Leyi', 'lei', 'AFTER'],
  ['RUB', 'Rus Rublesi', '₽', 'AFTER'],
  ['AZN', 'Azerbaycan Manatı', '₼', 'AFTER'],
  ['CHF', 'İsviçre Frangı', 'CHF', 'AFTER'],
  ['PLN', 'Polonya Zlotisi', 'zł', 'AFTER'],
  ['AED', 'BAE Dirhemi', 'د.إ', 'AFTER'],
  ['SAR', 'Suudi Riyali', '﷼', 'AFTER'],
  ['CAD', 'Kanada Doları', 'C$', 'BEFORE'],
  ['AUD', 'Avustralya Doları', 'A$', 'BEFORE'],
  ['JPY', 'Japon Yeni', '¥', 'BEFORE'],
  ['CNY', 'Çin Yuanı', '¥', 'BEFORE'],
  ['SEK', 'İsveç Kronu', 'kr', 'AFTER'],
  ['NOK', 'Norveç Kronu', 'kr', 'AFTER'],
  ['DKK', 'Danimarka Kronu', 'kr', 'AFTER'],
  ['CZK', 'Çek Korunası', 'Kč', 'AFTER'],
  ['HUF', 'Macar Forinti', 'Ft', 'AFTER'],
] as const;

const COUNTRY_CATALOG = [
  ['TR','Türkiye','+90','🇹🇷'],['DE','Almanya','+49','🇩🇪'],['GB','Birleşik Krallık','+44','🇬🇧'],['US','Amerika Birleşik Devletleri','+1','🇺🇸'],['BG','Bulgaristan','+359','🇧🇬'],['RO','Romanya','+40','🇷🇴'],['FR','Fransa','+33','🇫🇷'],['IT','İtalya','+39','🇮🇹'],['ES','İspanya','+34','🇪🇸'],['PT','Portekiz','+351','🇵🇹'],['NL','Hollanda','+31','🇳🇱'],['BE','Belçika','+32','🇧🇪'],['CH','İsviçre','+41','🇨🇭'],['AT','Avusturya','+43','🇦🇹'],['PL','Polonya','+48','🇵🇱'],['CZ','Çekya','+420','🇨🇿'],['HU','Macaristan','+36','🇭🇺'],['GR','Yunanistan','+30','🇬🇷'],['SE','İsveç','+46','🇸🇪'],['NO','Norveç','+47','🇳🇴'],['DK','Danimarka','+45','🇩🇰'],['FI','Finlandiya','+358','🇫🇮'],['RS','Sırbistan','+381','🇷🇸'],['BA','Bosna-Hersek','+387','🇧🇦'],['AL','Arnavutluk','+355','🇦🇱'],['MK','Kuzey Makedonya','+389','🇲🇰'],['AZ','Azerbaycan','+994','🇦🇿'],['GE','Gürcistan','+995','🇬🇪'],['AE','Birleşik Arap Emirlikleri','+971','🇦🇪'],['SA','Suudi Arabistan','+966','🇸🇦'],['QA','Katar','+974','🇶🇦'],['IL','İsrail','+972','🇮🇱'],['RU','Rusya','+7','🇷🇺'],['UA','Ukrayna','+380','🇺🇦'],['CN','Çin','+86','🇨🇳'],['JP','Japonya','+81','🇯🇵'],['KR','Güney Kore','+82','🇰🇷'],['IN','Hindistan','+91','🇮🇳'],['AU','Avustralya','+61','🇦🇺'],['CA','Kanada','+1','🇨🇦'],
] as const;

const SOCIAL_PLATFORMS = [
  'Instagram',
  'Facebook',
  'X / Twitter',
  'TikTok',
  'YouTube',
  'LinkedIn',
  'Pinterest',
  'WhatsApp',
  'Telegram',
  'Threads',
  'Diğer',
] as const;

type GeoNode = {id:string;name:string;code?:string|null;countryCode?:string|null;level:string};
const ALL_TIMEZONES = (() => {
  try {
    return Array.from(new Set(['UTC', 'Europe/Istanbul', ...Intl.supportedValuesOf('timeZone')])).sort((a,b)=>a.localeCompare(b));
  } catch { return ['UTC','Europe/Istanbul']; }
})();
function timezoneLabel(zone:string){
  try {
    const parts = new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:'shortOffset'}).formatToParts(new Date());
    const offset = parts.find(x=>x.type==='timeZoneName')?.value||'GMT';
    return `(${offset.replace('GMT','UTC')}) ${zone.replace(/_/g,' ')}`;
  }catch{return zone;}
}
function PlatformLocationFields({company,patch,request,countries}:{company:PlatformCompany;patch:(p:Partial<PlatformCompany>)=>void;request:(p:string)=>Promise<any>;countries:PlatformCountry[]}){
  const [roots,setRoots]=useState<GeoNode[]>([]);
  const [cities,setCities]=useState<GeoNode[]>([]);
  const [districts,setDistricts]=useState<GeoNode[]>([]);
  const [error,setError]=useState('');
  const root=roots.find(x=>x.code===company.country||x.countryCode===company.country||x.name===company.country);
  const city=cities.find(x=>x.name===company.city||x.code===company.city);
  useEffect(()=>{let active=true;void request('/superadmin/geo?level=COUNTRY&root=true').then((r:any)=>{if(active)setRoots(Array.isArray(r)?r:[])}).catch(()=>{if(active)setError('Ülke verisi yüklenemedi.')});return()=>{active=false}},[request]);
  useEffect(()=>{let active=true;setCities([]);setDistricts([]);if(root)void request('/superadmin/geo?level=ADMIN1&parentId='+encodeURIComponent(root.id)).then((r:any)=>{if(active)setCities(Array.isArray(r)?r:[])}).catch(()=>{if(active)setError('Şehir verisi alınamadı.')});return()=>{active=false}},[request,root?.id]);
  useEffect(()=>{let active=true;setDistricts([]);if(city)void request('/superadmin/geo?level=ADMIN2&parentId='+encodeURIComponent(city.id)).then((r:any)=>{if(active)setDistricts(Array.isArray(r)?r:[])}).catch(()=>{if(active)setError('İlçe verisi alınamadı.')});return()=>{active=false}},[request,city?.id]);
  const countryOptions = roots.length ? roots.map(x=>({key:x.id,code:x.code||x.countryCode||x.name,label:x.name})) : countries.filter(x=>x.isActive).map(x=>({key:x.code,code:x.code,label:x.name}));
  return <div className="grid gap-4">
    <Field label="Açık adres"><Textarea rows={3} value={company.address||''} onChange={e=>patch({address:e.target.value})} placeholder="Cadde, sokak, bina ve daire numarası"/></Field>
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Ülke"><Select value={countryOptions.find(x=>x.code===company.country)?.key||undefined} onValueChange={id=>{const x=countryOptions.find(y=>y.key===id);if(x)patch({country:x.code,city:'',district:''})}}><SelectTrigger><SelectValue placeholder="Ülke seçin"/></SelectTrigger><SelectContent>{countryOptions.map(x=><SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="İl / Şehir">{cities.length?<Select value={city?.id||undefined} onValueChange={id=>{const x=cities.find(y=>y.id===id);if(x)patch({city:x.name,district:''})}}><SelectTrigger><SelectValue placeholder="İl / şehir seçin"/></SelectTrigger><SelectContent>{cities.map(x=><SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select>:<Input value={company.city||''} onChange={e=>patch({city:e.target.value,district:''})} placeholder="Şehir adı"/>}</Field>
      <Field label="İlçe">{districts.length?<Select value={districts.find(x=>x.name===company.district)?.id||undefined} onValueChange={id=>{const x=districts.find(y=>y.id===id);if(x)patch({district:x.name})}}><SelectTrigger><SelectValue placeholder="İlçe seçin"/></SelectTrigger><SelectContent>{districts.map(x=><SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select>:<Input value={company.district||''} onChange={e=>patch({district:e.target.value})} placeholder="İlçe adı"/>}</Field>
      <Field label="Posta kodu"><Input value={company.postalCode||''} onChange={e=>patch({postalCode:e.target.value})} maxLength={12} placeholder="Posta kodu"/></Field>
    </div>
    {error?<p className="text-sm text-destructive">{error}</p>:null}
  </div>;
}

function Box({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <Card>
    <CardHeader>
      <CardHeading>{title}</CardHeading>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </CardHeader>
    <CardContent className="grid gap-4">{children}</CardContent>
  </Card>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="grid gap-2">
    <span className="text-sm font-medium">{label}</span>
    {children}
    {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
  </label>;
}

function SettingsShell({
  title,
  description,
  icon: Icon,
  busy,
  message,
  onSave,
  children,
}: {
  title: string;
  description: string;
  icon: any;
  busy: boolean;
  message: string;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return <>
    <Container>
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-2">
            <Icon className="size-5 text-primary" />
            <h1 className="text-xl font-semibold text-mono">{title}</h1>
          </div>
          <ToolbarDescription>{description}</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button onClick={onSave} disabled={busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            Kaydet
          </Button>
        </ToolbarActions>
      </Toolbar>
    </Container>
    {message ? <Container>
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        <CheckCircle2 className="size-4" />{message}
      </div>
    </Container> : null}
    <Container className="grid gap-5 pb-10">{children}</Container>
  </>;
}

function usePlatformSettings() {
  const { request, restoring } = useMasterSession();
  const [data, setData] = useState<PlatformSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (restoring) return;
    void request('/superadmin/platform-settings').then(setData);
  }, [request, restoring]);

  const save = async () => {
    if (!data) return;
    setBusy(true);
    setMessage('');
    try {
      const next = await request('/superadmin/platform-settings', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      setData(next);
      setMessage('Ayarlar kaydedildi.');
      window.setTimeout(() => setMessage(''), 2200);
    } finally {
      setBusy(false);
    }
  };

  return { data, setData, busy, message, save };
}

function LogoPicker({
  label,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const read = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp','image/svg+xml','image/x-icon'].includes(file.type)) return;
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result || ''));
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  return <div className="grid gap-2">
    <span className="text-sm font-medium">{label}</span>
    <div className="flex min-h-28 items-center gap-4 rounded-lg border p-4">
      <div className={compact ? 'grid size-16 place-items-center overflow-hidden rounded-lg bg-muted' : 'grid h-20 w-44 place-items-center overflow-hidden rounded-lg bg-muted'}>
        {value ? <img src={value} alt={label} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">Görsel yok</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <label className="cursor-pointer"><Upload className="size-4" />Yükle<input hidden type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon" onChange={read}/></label>
        </Button>
        {value ? <Button variant="outline" onClick={() => onChange('')}>Kaldır</Button> : null}
      </div>
    </div>
  </div>;
}

export function PlatformGeneralPage() {
  const s = usePlatformSettings();
  const {request} = useMasterSession();
  const [validationError,setValidationError] = useState('');
  const data = s.data;
  if (!data) return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin" /></div>;
  const company = data.company || {};
  const patchCompany = (patch: Partial<PlatformCompany>) => {setValidationError('');s.setData({ ...data, company: { ...company, ...patch } });};
  const defaultLocale = data.locales.find(x => x.isDefault && x.isActive)?.locale || data.locales.find(x => x.isActive)?.locale || '';
  const defaultCurrency = data.currencies.find(x => x.isDefault && x.isActive)?.code || data.currencies.find(x => x.isActive)?.code || '';
  const selectedCountry = data.countries.find(x=>x.code===company.phoneCountry) || data.countries.find(x=>x.code==='TR') || data.countries.find(x=>x.isActive);
  const dial = selectedCountry?.phoneCode || '+90';
  const phone = company.phone||'';
  const localPhone = phone.startsWith(dial) ? phone.slice(dial.length) : phone.replace(/^\+\d{1,3}/,'');
  const save = () => {
    if(company.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.email)){setValidationError('Geçerli bir e-posta adresi girin.');return;}
    if(company.phone && !/^\+[1-9]\d{6,14}$/.test(company.phone)){setValidationError('Telefon numarası ülke kodu dahil 7–15 rakam içermelidir.');return;}
    if(company.phone?.startsWith('+90') && !/^\+90[2-5]\d{9}$/.test(company.phone)){setValidationError('Türkiye numarasını başında sıfır olmadan 10 hane girin.');return;}
    if(company.website){try{const url=new URL(company.website);if(!['http:','https:'].includes(url.protocol))throw Error();}catch{setValidationError('Web sitesi http:// veya https:// ile başlamalı.');return;}}
    setValidationError('');void s.save();
  };
  return <SettingsShell title="Genel Ayarlar" description="Ticarti platformunun firma, iletişim ve sistem tanımları." icon={Building2} busy={s.busy} message={s.message} onSave={save}>
    {validationError?<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{validationError}</div>:null}
    <Box title="Firma Bilgileri" description="Kurumsal kimlik ve resmi kayıt bilgileri.">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Marka adı"><Input value={company.name||''} onChange={e=>patchCompany({name:e.target.value})}/></Field>
        <Field label="Yasal ünvan"><Input value={company.legalName||''} onChange={e=>patchCompany({legalName:e.target.value})}/></Field>
        <Field label="Vergi dairesi"><Input value={company.taxOffice||''} onChange={e=>patchCompany({taxOffice:e.target.value})}/></Field>
        <Field label="Vergi numarası"><Input value={company.taxNumber||''} onChange={e=>patchCompany({taxNumber:e.target.value})}/></Field>
      </div>
    </Box>
    <Box title="İletişim Bilgileri" description="Ticarti'nin resmi iletişim kanalları.">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="E-posta"><Input type="email" value={company.email||''} onChange={e=>patchCompany({email:e.target.value})}/></Field>
        <Field label="Web sitesi"><Input type="url" value={company.website||''} onChange={e=>patchCompany({website:e.target.value})} placeholder="https://ticarti.com"/></Field>
      </div>
      <Field label="Telefon">
        <div className="flex gap-2">
          <Select value={selectedCountry?.code||''} onValueChange={code=>{const hit=data.countries.find(x=>x.code===code);if(hit)patchCompany({phoneCountry:code,phone:hit.phoneCode+localPhone.replace(/\D/g,'').replace(/^0+/,'')})}}>
            <SelectTrigger className="w-44 shrink-0"><SelectValue placeholder="Alan kodu"/></SelectTrigger>
            <SelectContent>{data.countries.filter(x=>x.isActive).map(x=><SelectItem key={x.code} value={x.code}>{x.flag} {x.phoneCode} · {x.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input inputMode="tel" value={localPhone} maxLength={18} placeholder="Telefon numarası" onChange={e=>{const digits=e.target.value.replace(/\D/g,'').replace(/^0+/,'');patchCompany({phoneCountry:selectedCountry?.code||'TR',phone:digits?dial+digits:''})}}/>
        </div>
        <span className="text-xs text-muted-foreground">Numara, ülke koduyla E.164 biçiminde kaydedilir. Türkiye: 10 hane.</span>
      </Field>
    </Box>
    <Box title="Firma Adresi" description="Ülke, il ve ilçe bilgilerini mağaza adresleri gibi ayrı ayrı tanımlayın.">
      <PlatformLocationFields company={company} patch={patchCompany} request={request} countries={data.countries}/>
    </Box>
    <Box title="Sosyal Medya Hesapları" description="Ticarti'nin kurumsal sosyal medya hesapları.">
      <div className="grid gap-3">
        {(company.socialLinks||[]).map((row,index)=><div key={index} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[220px_1fr_auto] md:items-end">
          <Field label="Platform"><Select value={row.platform||'Instagram'} onValueChange={platform=>patchCompany({socialLinks:(company.socialLinks||[]).map((x,i)=>i===index?{...x,platform}:x)})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{SOCIAL_PLATFORMS.map(platform=><SelectItem key={platform} value={platform}>{platform}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Hesap URL"><Input type="url" value={row.url||''} placeholder="https://..." onChange={e=>patchCompany({socialLinks:(company.socialLinks||[]).map((x,i)=>i===index?{...x,url:e.target.value}:x)})}/></Field>
          <Button variant="outline" size="icon" onClick={()=>patchCompany({socialLinks:(company.socialLinks||[]).filter((_,i)=>i!==index)})}><Trash2 className="size-4"/></Button>
        </div>)}
        <div><Button variant="outline" onClick={()=>patchCompany({socialLinks:[...(company.socialLinks||[]),{platform:'Instagram',url:''}]})}><Plus className="size-4"/>Hesap ekle</Button></div>
      </div>
    </Box>
    <Box title="Varsayılanlar" description="Saat dilimleri sistemin desteklediği tam IANA listesinden gelir.">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Saat dilimi"><Select value={company.timezone||'Europe/Istanbul'} onValueChange={v=>patchCompany({timezone:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent className="max-h-80">{ALL_TIMEZONES.map(value=><SelectItem key={value} value={value}>{timezoneLabel(value)}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Varsayılan dil"><Select value={defaultLocale} onValueChange={locale=>s.setData({...data,locales:data.locales.map(x=>({...x,isDefault:x.locale===locale}))})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{data.locales.filter(x=>x.isActive).map(x=><SelectItem key={x.locale} value={x.locale}>{x.label}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Varsayılan para birimi"><Select value={defaultCurrency} onValueChange={code=>s.setData({...data,currencies:data.currencies.map(x=>({...x,isDefault:x.code===code}))})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{data.currencies.filter(x=>x.isActive).map(x=><SelectItem key={x.code} value={x.code}>{x.name} · {x.code}</SelectItem>)}</SelectContent></Select></Field>
      </div>
    </Box>
    <Box title="Marka & Görseller" description="Logo ve favicon alanları firma bilgilerinden ayrı tutulur.">
      <div className="grid gap-5 xl:grid-cols-2"><LogoPicker label="Ana logo" value={company.logoUrl} onChange={v=>patchCompany({logoUrl:v})}/><LogoPicker label="Koyu zemin logosu" value={company.logoDarkUrl} onChange={v=>patchCompany({logoDarkUrl:v})}/></div>
      <LogoPicker label="Favicon / ikon" compact value={company.faviconUrl} onChange={v=>patchCompany({faviconUrl:v})}/>
    </Box>
  </SettingsShell>;
}

export function PlatformLanguagesPage() {
  const s = usePlatformSettings();
  const [candidate,setCandidate] = useState('');
  const data = s.data;
  const available = useMemo(() => LANGUAGE_CATALOG.filter(([code]) => !data?.locales.some(x=>x.locale===code)), [data]);
  if (!data) return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin" /></div>;

  const add = () => {
    const hit = LANGUAGE_CATALOG.find(([code]) => code === candidate);
    if (!hit) return;
    s.setData({...data,locales:[...data.locales,{locale:hit[0],label:hit[1],flag:hit[2],isActive:true,isDefault:data.locales.length===0,sortOrder:data.locales.length}]});
    setCandidate('');
  };

  return <SettingsShell title="Dil Ayarları" description="Mağazalara ve platform ekranlarına açılabilecek dilleri merkezi olarak yönetin." icon={Languages} busy={s.busy} message={s.message} onSave={s.save}>
    <Box title="Dil ekle" description="Serbest kod yazmak yerine desteklenen dil kataloğundan seçim yapın.">
      <div className="flex flex-col gap-3 md:flex-row">
        <Select value={candidate} onValueChange={setCandidate}>
          <SelectTrigger className="md:max-w-sm"><SelectValue placeholder="Dil seçin" /></SelectTrigger>
          <SelectContent>{available.map(([code,label,flag])=><SelectItem key={code} value={code}>{flag} {label} · {code}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" onClick={add} disabled={!candidate}><Plus className="size-4"/>Dil ekle</Button>
      </div>
    </Box>
    <Box title="Tanımlı Diller">
      <div className="grid gap-3">
        {data.locales.map((row,index)=><div key={`${row.locale}-${index}`} className="grid gap-3 rounded-lg border p-4 lg:grid-cols-[90px_1fr_160px_120px_140px_auto] lg:items-end">
          <Field label="Bayrak">
            <Input value={row.flag || ''} onChange={e=>s.setData({...data,locales:data.locales.map((x,i)=>i===index?{...x,flag:e.target.value}:x)})} placeholder="🇹🇷" className="text-center text-xl"/>
          </Field>
          <Field label="Dil adı">
            <Input value={row.label} onChange={e=>s.setData({...data,locales:data.locales.map((x,i)=>i===index?{...x,label:e.target.value}:x)})}/>
          </Field>
          <Field label="Dil kodu">
            <Input value={row.locale} onChange={e=>s.setData({...data,locales:data.locales.map((x,i)=>i===index?{...x,locale:e.target.value.toLowerCase()}:x)})}/>
          </Field>
          <label className="flex h-10 items-center gap-2 text-sm"><Switch checked={row.isActive!==false} onCheckedChange={v=>s.setData({...data,locales:data.locales.map((x,i)=>i===index?{...x,isActive:v,isDefault:v?x.isDefault:false}:x)})}/>Aktif</label>
          <label className="flex h-10 items-center gap-2 text-sm"><input type="radio" name="defaultLocale" checked={!!row.isDefault} disabled={!row.isActive} onChange={()=>s.setData({...data,locales:data.locales.map((x,i)=>({...x,isDefault:i===index}))})}/>Varsayılan</label>
          <Button variant="outline" size="icon" disabled={row.isDefault} onClick={()=>s.setData({...data,locales:data.locales.filter((_,i)=>i!==index)})}><Trash2 className="size-4"/></Button>
        </div>)}
      </div>
    </Box>
  </SettingsShell>;
}

export function PlatformCurrenciesPage() {
  const s = usePlatformSettings();
  const [candidate,setCandidate] = useState('');
  const data = s.data;
  const available = useMemo(() => CURRENCY_CATALOG.filter(([code]) => !data?.currencies.some(x=>x.code===code)), [data]);
  if (!data) return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin" /></div>;

  const add = () => {
    const hit = CURRENCY_CATALOG.find(([code]) => code === candidate);
    if (!hit) return;
    s.setData({...data,currencies:[...data.currencies,{code:hit[0],name:hit[1],symbol:hit[2],symbolPosition:hit[3] as 'BEFORE' | 'AFTER',isActive:true,isDefault:data.currencies.length===0,sortOrder:data.currencies.length}]});
    setCandidate('');
  };

  return <SettingsShell title="Para Birimleri" description="Mağazalara açılabilecek para birimlerini merkezi katalogdan yönetin." icon={WalletCards} busy={s.busy} message={s.message} onSave={s.save}>
    <Box title="Para birimi ekle">
      <div className="flex flex-col gap-3 md:flex-row">
        <Select value={candidate} onValueChange={setCandidate}>
          <SelectTrigger className="md:max-w-sm"><SelectValue placeholder="Para birimi seçin" /></SelectTrigger>
          <SelectContent>{available.map(([code,name,symbol])=><SelectItem key={code} value={code}>{name} · {code} · {symbol}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" onClick={add} disabled={!candidate}><Plus className="size-4"/>Para birimi ekle</Button>
      </div>
    </Box>
    <Box title="Tanımlı Para Birimleri">
      <div className="grid gap-3">
        {data.currencies.map((row,index)=><div key={`${row.code}-${index}`} className="grid gap-3 rounded-lg border p-4 xl:grid-cols-[1.2fr_120px_110px_190px_120px_140px_auto] xl:items-end">
          <Field label="Para birimi">
            <Input value={row.name} onChange={e=>s.setData({...data,currencies:data.currencies.map((x,i)=>i===index?{...x,name:e.target.value}:x)})}/>
          </Field>
          <Field label="Kod">
            <Input value={row.code} onChange={e=>s.setData({...data,currencies:data.currencies.map((x,i)=>i===index?{...x,code:e.target.value.toUpperCase()}:x)})}/>
          </Field>
          <Field label="Sembol">
            <Input value={row.symbol} onChange={e=>s.setData({...data,currencies:data.currencies.map((x,i)=>i===index?{...x,symbol:e.target.value}:x)})}/>
          </Field>
          <Field label="Sembol konumu">
            <Select value={row.symbolPosition || 'BEFORE'} onValueChange={v=>s.setData({...data,currencies:data.currencies.map((x,i)=>i===index?{...x,symbolPosition:v as 'BEFORE'|'AFTER'}:x)})}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="BEFORE">Önce · {row.symbol || '₺'}1.000</SelectItem>
                <SelectItem value="AFTER">Sonra · 1.000 {row.symbol || '₺'}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <label className="flex h-10 items-center gap-2 text-sm"><Switch checked={row.isActive!==false} onCheckedChange={v=>s.setData({...data,currencies:data.currencies.map((x,i)=>i===index?{...x,isActive:v,isDefault:v?x.isDefault:false}:x)})}/>Aktif</label>
          <label className="flex h-10 items-center gap-2 text-sm"><input type="radio" name="defaultCurrency" checked={!!row.isDefault} disabled={!row.isActive} onChange={()=>s.setData({...data,currencies:data.currencies.map((x,i)=>({...x,isDefault:i===index}))})}/>Varsayılan</label>
          <Button variant="outline" size="icon" disabled={row.isDefault} onClick={()=>s.setData({...data,currencies:data.currencies.filter((_,i)=>i!==index)})}><Trash2 className="size-4"/></Button>
        </div>)}
      </div>
    </Box>
  </SettingsShell>;
}


export function PlatformCountriesPage() {
  const s = usePlatformSettings();
  const [candidate,setCandidate]=useState('');
  const data=s.data;
  const available=useMemo(()=>COUNTRY_CATALOG.filter(([code])=>!data?.countries?.some(x=>x.code===code)),[data]);
  if(!data)return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin"/></div>;
  const add=()=>{const hit=COUNTRY_CATALOG.find(([code])=>code===candidate);if(!hit)return;s.setData({...data,countries:[...(data.countries||[]),{code:hit[0],name:hit[1],phoneCode:hit[2],flag:hit[3],isActive:true,sortOrder:(data.countries||[]).length}]});setCandidate('')};
  return <SettingsShell title="Ülkeler" description="Kayıt ve iletişim alanlarında kullanılabilecek ülkeleri merkezi olarak yönetin." icon={Globe2} busy={s.busy} message={s.message} onSave={s.save}>
    <Box title="Ülke ekle"><div className="flex flex-col gap-3 md:flex-row"><Select value={candidate} onValueChange={setCandidate}><SelectTrigger className="md:max-w-sm"><SelectValue placeholder="Ülke seçin"/></SelectTrigger><SelectContent>{available.map(([code,name,,flag])=><SelectItem key={code} value={code}>{flag} {name} · {code}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={add} disabled={!candidate}><Plus className="size-4"/>Ülke ekle</Button></div></Box>
    <Box title="Tanımlı Ülkeler"><div className="grid gap-3">{(data.countries||[]).map((row,index)=><div key={row.code+'-'+index} className="grid gap-3 rounded-lg border p-4 lg:grid-cols-[90px_1fr_120px_140px_120px_auto] lg:items-end">
      <Field label="Bayrak"><Input value={row.flag||''} className="text-center text-xl" onChange={e=>s.setData({...data,countries:data.countries.map((x,i)=>i===index?{...x,flag:e.target.value}:x)})}/></Field>
      <Field label="Ülke"><Input value={row.name} onChange={e=>s.setData({...data,countries:data.countries.map((x,i)=>i===index?{...x,name:e.target.value}:x)})}/></Field>
      <Field label="ISO"><Input value={row.code} onChange={e=>s.setData({...data,countries:data.countries.map((x,i)=>i===index?{...x,code:e.target.value.toUpperCase()}:x)})}/></Field>
      <Field label="Telefon kodu"><Input value={row.phoneCode} onChange={e=>s.setData({...data,countries:data.countries.map((x,i)=>i===index?{...x,phoneCode:e.target.value}:x)})}/></Field>
      <label className="flex h-10 items-center gap-2 text-sm"><Switch checked={row.isActive!==false} onCheckedChange={isActive=>s.setData({...data,countries:data.countries.map((x,i)=>i===index?{...x,isActive}:x)})}/>Aktif</label>
      <Button variant="outline" size="icon" onClick={()=>s.setData({...data,countries:data.countries.filter((_,i)=>i!==index)})}><Trash2 className="size-4"/></Button>
    </div>)}</div></Box>
  </SettingsShell>;
}
