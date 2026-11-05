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
  isActive: boolean;
  isDefault: boolean;
  sortOrder?: number;
};

type PlatformCurrency = {
  code: string;
  name: string;
  symbol: string;
  isActive: boolean;
  isDefault: boolean;
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
  timezone?: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  faviconUrl?: string;
};

type PlatformSettings = {
  company: PlatformCompany;
  locales: PlatformLocale[];
  currencies: PlatformCurrency[];
};

const LANGUAGE_CATALOG = [
  ['tr', 'Türkçe'],
  ['en', 'English'],
  ['bg', 'Български'],
  ['de', 'Deutsch'],
  ['ru', 'Русский'],
  ['ar', 'العربية'],
  ['az', 'Azərbaycan dili'],
  ['ro', 'Română'],
  ['sq', 'Shqip'],
  ['bs', 'Bosanski'],
  ['sr', 'Srpski'],
  ['fr', 'Français'],
  ['pt', 'Português'],
  ['es', 'Español'],
  ['uk', 'Українська'],
] as const;

const CURRENCY_CATALOG = [
  ['TRY', 'Türk Lirası', '₺'],
  ['USD', 'US Dollar', '$'],
  ['EUR', 'Euro', '€'],
  ['GBP', 'British Pound', '£'],
  ['BGN', 'Bulgar Levası', 'лв'],
  ['RON', 'Rumen Leyi', 'lei'],
  ['RUB', 'Rus Rublesi', '₽'],
  ['AZN', 'Azerbaycan Manatı', '₼'],
  ['CHF', 'İsviçre Frangı', 'CHF'],
  ['PLN', 'Polonya Zlotisi', 'zł'],
  ['AED', 'BAE Dirhemi', 'د.إ'],
  ['SAR', 'Suudi Riyali', '﷼'],
] as const;

const TIMEZONES = [
  ['Europe/Istanbul', 'İstanbul (UTC+3)'],
  ['Europe/London', 'Londra'],
  ['Europe/Berlin', 'Berlin'],
  ['Europe/Sofia', 'Sofya'],
  ['Europe/Bucharest', 'Bükreş'],
  ['Europe/Moscow', 'Moskova'],
  ['Asia/Dubai', 'Dubai'],
  ['Asia/Baku', 'Bakü'],
  ['America/New_York', 'New York'],
  ['America/Los_Angeles', 'Los Angeles'],
] as const;

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
  const data = s.data;
  if (!data) return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin" /></div>;
  const company = data.company || {};
  const patchCompany = (patch: Partial<PlatformCompany>) => s.setData({ ...data, company: { ...company, ...patch } });
  const defaultLocale = data.locales.find(x => x.isDefault && x.isActive)?.locale || data.locales.find(x => x.isActive)?.locale || '';
  const defaultCurrency = data.currencies.find(x => x.isDefault && x.isActive)?.code || data.currencies.find(x => x.isActive)?.code || '';

  return <SettingsShell title="Genel Ayarlar" description="Ticarti platformunun firma, marka ve varsayılan sistem tanımları." icon={Building2} busy={s.busy} message={s.message} onSave={s.save}>
    <Box title="Marka & Görseller" description="Platform genelinde kullanılacak Ticarti marka görselleri.">
      <div className="grid gap-5 xl:grid-cols-2">
        <LogoPicker label="Ana logo" value={company.logoUrl} onChange={v => patchCompany({ logoUrl: v })}/>
        <LogoPicker label="Koyu zemin logosu" value={company.logoDarkUrl} onChange={v => patchCompany({ logoDarkUrl: v })}/>
      </div>
      <LogoPicker label="Favicon / ikon" compact value={company.faviconUrl} onChange={v => patchCompany({ faviconUrl: v })}/>
    </Box>

    <Box title="Firma Bilgileri">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Marka adı"><Input value={company.name || ''} onChange={e => patchCompany({ name: e.target.value })}/></Field>
        <Field label="Yasal ünvan"><Input value={company.legalName || ''} onChange={e => patchCompany({ legalName: e.target.value })}/></Field>
        <Field label="E-posta"><Input type="email" value={company.email || ''} onChange={e => patchCompany({ email: e.target.value })}/></Field>
        <Field label="Telefon"><Input value={company.phone || ''} onChange={e => patchCompany({ phone: e.target.value })}/></Field>
        <Field label="Web sitesi"><Input value={company.website || ''} onChange={e => patchCompany({ website: e.target.value })}/></Field>
        <Field label="Vergi dairesi"><Input value={company.taxOffice || ''} onChange={e => patchCompany({ taxOffice: e.target.value })}/></Field>
        <Field label="Vergi numarası"><Input value={company.taxNumber || ''} onChange={e => patchCompany({ taxNumber: e.target.value })}/></Field>
      </div>
      <Field label="Adres"><Textarea rows={4} value={company.address || ''} onChange={e => patchCompany({ address: e.target.value })}/></Field>
    </Box>

    <Box title="Varsayılanlar" description="Seçenekler yalnızca platformda aktif tanımlardan gelir.">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Saat dilimi">
          <Select value={company.timezone || 'Europe/Istanbul'} onValueChange={v => patchCompany({ timezone: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIMEZONES.map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Varsayılan dil">
          <Select value={defaultLocale} onValueChange={locale => s.setData({...data,locales:data.locales.map(x=>({...x,isDefault:x.locale===locale}))})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{data.locales.filter(x=>x.isActive).map(x=><SelectItem key={x.locale} value={x.locale}>{x.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Varsayılan para birimi">
          <Select value={defaultCurrency} onValueChange={code => s.setData({...data,currencies:data.currencies.map(x=>({...x,isDefault:x.code===code}))})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{data.currencies.filter(x=>x.isActive).map(x=><SelectItem key={x.code} value={x.code}>{x.name} · {x.code}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
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
    s.setData({...data,locales:[...data.locales,{locale:hit[0],label:hit[1],isActive:true,isDefault:data.locales.length===0,sortOrder:data.locales.length}]});
    setCandidate('');
  };

  return <SettingsShell title="Dil Ayarları" description="Mağazalara ve platform ekranlarına açılabilecek dilleri merkezi olarak yönetin." icon={Languages} busy={s.busy} message={s.message} onSave={s.save}>
    <Box title="Dil ekle" description="Serbest kod yazmak yerine desteklenen dil kataloğundan seçim yapın.">
      <div className="flex flex-col gap-3 md:flex-row">
        <Select value={candidate} onValueChange={setCandidate}>
          <SelectTrigger className="md:max-w-sm"><SelectValue placeholder="Dil seçin" /></SelectTrigger>
          <SelectContent>{available.map(([code,label])=><SelectItem key={code} value={code}>{label} · {code}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" onClick={add} disabled={!candidate}><Plus className="size-4"/>Dil ekle</Button>
      </div>
    </Box>
    <Box title="Tanımlı Diller">
      <div className="grid gap-3">
        {data.locales.map((row,index)=><div key={row.locale} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_150px_150px_auto] md:items-center">
          <div><div className="font-medium">{row.label}</div><div className="text-xs text-muted-foreground">{row.locale}</div></div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={row.isActive!==false} onCheckedChange={v=>s.setData({...data,locales:data.locales.map((x,i)=>i===index?{...x,isActive:v,isDefault:v?x.isDefault:false}:x)})}/>Aktif</label>
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="defaultLocale" checked={!!row.isDefault} disabled={!row.isActive} onChange={()=>s.setData({...data,locales:data.locales.map((x,i)=>({...x,isDefault:i===index}))})}/>Varsayılan</label>
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
    s.setData({...data,currencies:[...data.currencies,{code:hit[0],name:hit[1],symbol:hit[2],isActive:true,isDefault:data.currencies.length===0,sortOrder:data.currencies.length}]});
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
        {data.currencies.map((row,index)=><div key={row.code} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_100px_150px_150px_auto] md:items-center">
          <div><div className="font-medium">{row.name}</div><div className="text-xs text-muted-foreground">{row.code}</div></div>
          <div className="text-sm font-semibold">{row.symbol}</div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={row.isActive!==false} onCheckedChange={v=>s.setData({...data,currencies:data.currencies.map((x,i)=>i===index?{...x,isActive:v,isDefault:v?x.isDefault:false}:x)})}/>Aktif</label>
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="defaultCurrency" checked={!!row.isDefault} disabled={!row.isActive} onChange={()=>s.setData({...data,currencies:data.currencies.map((x,i)=>({...x,isDefault:i===index}))})}/>Varsayılan</label>
          <Button variant="outline" size="icon" disabled={row.isDefault} onClick={()=>s.setData({...data,currencies:data.currencies.filter((_,i)=>i!==index)})}><Trash2 className="size-4"/></Button>
        </div>)}
      </div>
    </Box>
  </SettingsShell>;
}
