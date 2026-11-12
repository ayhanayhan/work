'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Blocks, CheckCircle2, Code2, Eye, LoaderCircle, Save, Send, X } from 'lucide-react';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminSession } from '@/app/components/AdminSession';
import { FormField } from '@/app/(protected)/components/marketing-form-ui';
import { defaultEmailDesign, emailBlockDefault, type VisualEmailBlock, type EmailTemplateDesign, VisualEmailBuilder } from '@/app/(protected)/components/visual-email-builder';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const events = [
  ['order_created', 'Sipariş oluşturuldu', 'Müşteri siparişini tamamladığında'],
  ['payment_received', 'Ödeme alındı', 'Ödeme başarıyla tahsil edildiğinde'],
  ['payment_failed', 'Ödeme başarısız', 'Ödeme başarısız olduğunda'],
  ['order_preparing', 'Sipariş hazırlanıyor', 'Sipariş hazırlık sürecine girdiğinde'],
  ['order_shipped', 'Sipariş kargoda', 'Kargo gönderildiğinde'],
  ['order_delivered', 'Sipariş teslim edildi', 'Teslimat tamamlandığında'],
  ['order_cancelled', 'Sipariş iptal edildi', 'Sipariş iptal edildiğinde'],
  ['return_requested', 'İade talebi alındı', 'Müşteri iade talebi açtığında'],
  ['return_approved', 'İade onaylandı', 'İade onaylandığında'],
  ['return_rejected', 'İade reddedildi', 'İade talebi reddedildiğinde'],
  ['return_refunded', 'İade tamamlandı', 'İade tutarı geri ödendiğinde'],
] as const;

const languageCode = (locale: string) => String(locale || 'tr').toLowerCase().split(/[-_]/)[0];

const eventCopy = (event: string, locale: string) => {
  const lang = languageCode(locale);
  const tr: Record<string, any> = {
    order_created:{subject:'Siparişiniz alındı · {{store_name}}',preheader:'Siparişiniz başarıyla oluşturuldu.',heading:'Siparişinizi aldık',text:'Merhaba {{customer_name}},\n\n#{{order_no}} numaralı siparişinizi aldık. Sipariş detaylarınızı aşağıda görebilirsiniz.',button:'Siparişimi görüntüle'},
    payment_received:{subject:'Ödemeniz alındı · Sipariş #{{order_no}}',preheader:'Ödemeniz başarıyla alındı.',heading:'Ödemeniz başarıyla alındı',text:'Merhaba {{customer_name}},\n\n#{{order_no}} numaralı siparişinizin ödemesi başarıyla alındı. Siparişiniz işleme alınmıştır.',button:'Siparişimi görüntüle'},
    payment_failed:{subject:'Ödemeniz tamamlanamadı · Sipariş #{{order_no}}',preheader:'Ödeme işleminiz tamamlanamadı.',heading:'Ödeme işlemi tamamlanamadı',text:'Merhaba {{customer_name}},\n\n#{{order_no}} numaralı siparişiniz için ödeme işlemi tamamlanamadı. Sipariş detaylarından ödeme durumunu kontrol edebilirsiniz.',button:'Siparişimi görüntüle'},
    order_preparing:{subject:'Siparişiniz hazırlanıyor · #{{order_no}}',preheader:'Siparişinizi hazırlıyoruz.',heading:'Siparişiniz hazırlanıyor',text:'Merhaba {{customer_name}},\n\n#{{order_no}} numaralı siparişinizi hazırlamaya başladık. Kargoya verildiğinde sizi tekrar bilgilendireceğiz.',button:'Siparişimi görüntüle'},
    order_shipped:{subject:'Siparişiniz kargoda · #{{order_no}}',preheader:'Siparişiniz kargoya verildi.',heading:'Siparişiniz kargoya verildi',text:'Merhaba {{customer_name}},\n\n#{{order_no}} numaralı siparişiniz kargoya verildi. Takip numaranız: {{tracking_no}}',button:'Siparişimi takip et'},
    order_delivered:{subject:'Siparişiniz teslim edildi · #{{order_no}}',preheader:'Siparişiniz teslim edildi.',heading:'Siparişiniz teslim edildi',text:'Merhaba {{customer_name}},\n\n#{{order_no}} numaralı siparişiniz teslim edildi. Bizi tercih ettiğiniz için teşekkür ederiz.',button:'Siparişimi görüntüle'},
    order_cancelled:{subject:'Siparişiniz iptal edildi · #{{order_no}}',preheader:'Siparişiniz iptal edildi.',heading:'Siparişiniz iptal edildi',text:'Merhaba {{customer_name}},\n\n#{{order_no}} numaralı siparişiniz iptal edildi. Ödeme alınmışsa iade süreci ödeme yönteminize göre başlatılır.',button:'Sipariş detayları'},
    return_requested:{subject:'İade talebinizi aldık · #{{order_no}}',preheader:'İade talebiniz bize ulaştı.',heading:'İade talebinizi aldık',text:'Merhaba {{customer_name}},\n\n#{{order_no}} numaralı siparişiniz için oluşturduğunuz iade talebini aldık. İnceleme sonucu size bildirilecektir.',button:'İade detayları'},
    return_approved:{subject:'İade talebiniz onaylandı · #{{order_no}}',preheader:'İade talebiniz onaylandı.',heading:'İade talebiniz onaylandı',text:'Merhaba {{customer_name}},\n\n#{{order_no}} numaralı siparişiniz için iade talebiniz onaylandı. Sonraki adımları sipariş detaylarından takip edebilirsiniz.',button:'İade detayları'},
    return_rejected:{subject:'İade talebiniz sonuçlandı · #{{order_no}}',preheader:'İade talebiniz sonuçlandı.',heading:'İade talebiniz sonuçlandı',text:'Merhaba {{customer_name}},\n\n#{{order_no}} numaralı siparişiniz için iade talebiniz onaylanmadı. Ayrıntılar için sipariş detaylarını inceleyebilirsiniz.',button:'İade detayları'},
    return_refunded:{subject:'İadeniz tamamlandı · #{{order_no}}',preheader:'İade ödemeniz tamamlandı.',heading:'İadeniz tamamlandı',text:'Merhaba {{customer_name}},\n\n#{{order_no}} numaralı siparişinizin iade işlemi tamamlandı. Tutarın hesabınıza yansıma süresi ödeme kuruluşunuza göre değişebilir.',button:'Sipariş detayları'},
  };
  const en: Record<string, any> = {
    order_created:{subject:'We received your order · {{store_name}}',preheader:'Your order has been created successfully.',heading:'We received your order',text:'Hello {{customer_name}},\n\nWe received order #{{order_no}}. You can review the order details below.',button:'View my order'},
    payment_received:{subject:'Payment received · Order #{{order_no}}',preheader:'Your payment was received successfully.',heading:'Payment received',text:'Hello {{customer_name}},\n\nPayment for order #{{order_no}} was received successfully. Your order is now being processed.',button:'View my order'},
    payment_failed:{subject:'Payment could not be completed · Order #{{order_no}}',preheader:'Your payment could not be completed.',heading:'Payment could not be completed',text:'Hello {{customer_name}},\n\nPayment for order #{{order_no}} could not be completed. You can check the payment status from your order details.',button:'View my order'},
    order_preparing:{subject:'Your order is being prepared · #{{order_no}}',preheader:'We are preparing your order.',heading:'Your order is being prepared',text:'Hello {{customer_name}},\n\nWe started preparing order #{{order_no}}. We will notify you again when it ships.',button:'View my order'},
    order_shipped:{subject:'Your order has shipped · #{{order_no}}',preheader:'Your order is on the way.',heading:'Your order has shipped',text:'Hello {{customer_name}},\n\nOrder #{{order_no}} has shipped. Tracking number: {{tracking_no}}',button:'Track my order'},
    order_delivered:{subject:'Your order was delivered · #{{order_no}}',preheader:'Your order was delivered.',heading:'Your order was delivered',text:'Hello {{customer_name}},\n\nOrder #{{order_no}} was delivered. Thank you for choosing us.',button:'View my order'},
    order_cancelled:{subject:'Your order was cancelled · #{{order_no}}',preheader:'Your order was cancelled.',heading:'Your order was cancelled',text:'Hello {{customer_name}},\n\nOrder #{{order_no}} was cancelled. If payment was collected, the refund process will follow your payment method.',button:'Order details'},
    return_requested:{subject:'We received your return request · #{{order_no}}',preheader:'Your return request reached us.',heading:'We received your return request',text:'Hello {{customer_name}},\n\nWe received your return request for order #{{order_no}}. We will notify you after review.',button:'Return details'},
    return_approved:{subject:'Your return was approved · #{{order_no}}',preheader:'Your return request was approved.',heading:'Your return was approved',text:'Hello {{customer_name}},\n\nYour return request for order #{{order_no}} was approved. You can follow the next steps from your order details.',button:'Return details'},
    return_rejected:{subject:'Your return request was reviewed · #{{order_no}}',preheader:'Your return request was reviewed.',heading:'Your return request was reviewed',text:'Hello {{customer_name}},\n\nYour return request for order #{{order_no}} was not approved. Please review the order details for more information.',button:'Return details'},
    return_refunded:{subject:'Your refund is complete · #{{order_no}}',preheader:'Your refund was completed.',heading:'Your refund is complete',text:'Hello {{customer_name}},\n\nThe refund for order #{{order_no}} is complete. Posting time may vary depending on your payment provider.',button:'Order details'},
  };
  const pt: Record<string, any> = {};
  const ru: Record<string, any> = {};
  const base = lang === 'en' ? en : lang === 'pt' ? pt : lang === 'ru' ? ru : tr;
  const fallback = (lang === 'en' ? en : tr)[event] || tr.order_created;
  if ((lang === 'pt' || lang === 'ru') && !base[event]) {
    const labels: Record<string, Record<string, string>> = {
      pt:{order_created:'Recebemos o seu pedido',payment_received:'Pagamento recebido',payment_failed:'Não foi possível concluir o pagamento',order_preparing:'O seu pedido está a ser preparado',order_shipped:'O seu pedido foi enviado',order_delivered:'O seu pedido foi entregue',order_cancelled:'O seu pedido foi cancelado',return_requested:'Recebemos o seu pedido de devolução',return_approved:'A sua devolução foi aprovada',return_rejected:'O seu pedido de devolução foi analisado',return_refunded:'O seu reembolso foi concluído'},
      ru:{order_created:'Мы получили ваш заказ',payment_received:'Оплата получена',payment_failed:'Не удалось завершить оплату',order_preparing:'Ваш заказ готовится',order_shipped:'Ваш заказ отправлен',order_delivered:'Ваш заказ доставлен',order_cancelled:'Ваш заказ отменён',return_requested:'Мы получили запрос на возврат',return_approved:'Возврат одобрен',return_rejected:'Запрос на возврат рассмотрен',return_refunded:'Возврат средств завершён'},
    };
    const heading = labels[lang]?.[event] || fallback.heading;
    return {...fallback, heading, subject:`${heading} · #{{order_no}}`, preheader:heading, text: lang==='pt' ? `Olá {{customer_name}},\n\nEsta é uma atualização sobre o pedido #{{order_no}}. Consulte os detalhes abaixo para obter as informações mais recentes.` : `Здравствуйте, {{customer_name}}.\n\nЭто обновление по заказу #{{order_no}}. Актуальную информацию вы можете посмотреть ниже.`, button: lang==='pt'?'Ver detalhes':'Посмотреть детали'};
  }
  return base[event] || fallback;
};

const defaultBlocks = (event: string, locale: string): VisualEmailBlock[] => {
  const copy = eventCopy(event, locale);
  const header = emailBlockDefault('HEADER');
  const heading = emailBlockDefault('HEADING'); heading.content.text = copy.heading;
  const text = emailBlockDefault('TEXT'); text.content.text = copy.text;
  const button = emailBlockDefault('BUTTON'); button.content.text = copy.button;
  const footer = emailBlockDefault('FOOTER'); footer.content.showLogo = true;
  return [header, heading, text, ...(event.startsWith('order_') || event.startsWith('return_') || event.startsWith('payment_') ? [emailBlockDefault('ORDER_SUMMARY')] : []), button, footer];
};

const normalizeTemplate = (raw: any, event: string, locale: string) => {
  const copy = eventCopy(event, locale);
  const template = raw && typeof raw === 'object' ? {...raw} : {};
  const blocks = Array.isArray(template.blocks) && template.blocks.length ? template.blocks.map((b:any)=>({...b,content:{...(b.content||{})},settings:{...(b.settings||{})}})) : defaultBlocks(event, locale);
  for (const block of blocks) {
    if (block.type === 'HEADING' && (!block.content.text || block.content.text === 'Siparişinizle ilgili güncelleme')) block.content.text = copy.heading;
    if (block.type === 'TEXT' && (!block.content.text || String(block.content.text).includes('Mesajınızı buraya yazın'))) block.content.text = copy.text;
    if (block.type === 'BUTTON' && (!block.content.text || block.content.text === 'Siparişimi görüntüle')) block.content.text = copy.button;
    if (block.type === 'FOOTER' && block.content.showLogo == null) block.content.showLogo = true;
    if (block.type === 'HEADER' && block.content.showLogo == null) block.content.showLogo = true;
  }
  const html=String(template.html||'');
  const editorMode=String(template.editorMode||'VISUAL').toUpperCase()==='HTML'&&html.trim()?'HTML':'VISUAL';
  return {enabled:template.enabled!==false,subject:template.subject||copy.subject,preheader:template.preheader||copy.preheader,editorMode,html,blocks,design:{...defaultEmailDesign(),...(template.design||{})}};
};

const baseTemplate = (event: string, locale: string) => normalizeTemplate(null, event, locale);

export default function Page() {
  const router = useRouter();
  const { session } = useAdminSession();
  const storeId = session?.storeId || '';

  const [data, setData] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [sender, setSender] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [event, setEvent] = useState('order_created');
  const [locale, setLocale] = useState('tr-TR');
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);

  const headers = useCallback(
    (json = false) => ({
      ...(json ? { 'content-type': 'application/json' } : {}),
      authorization: `Bearer ${session?.accessToken || ''}`,
      'x-tenant-id': session?.tenantId || '',
    }),
    [session?.accessToken, session?.tenantId],
  );

  const load = useCallback(async () => {
    if (!storeId) return;
    const [a, b, c, d, e, f] = await Promise.all([
      fetch(`${API}/admin/store-settings/${storeId}/communication`, { credentials: 'include', headers: headers() }),
      fetch(`${API}/admin/store-settings/${storeId}`, { credentials: 'include', headers: headers() }),
      fetch(`${API}/admin/email/settings`, { credentials: 'include', headers: headers() }),
      fetch(`${API}/admin/products?storeId=${encodeURIComponent(storeId)}&limit=200`, { credentials: 'include', headers: headers() }),
      fetch(`${API}/admin/categories?storeId=${encodeURIComponent(storeId)}&limit=200`, { credentials: 'include', headers: headers() }),
      fetch(`${API}/admin/pages?storeId=${encodeURIComponent(storeId)}`, { credentials: 'include', headers: headers() }),
    ]);
    const comm = a.ok ? await a.json() : null;
    const s = b.ok ? await b.json() : null;
    if (s) {
      setStore(s);
      const def = (s.locales || []).find((x: any) => x.isDefault)?.locale || (s.locales || [])[0]?.locale || s.locale || 'tr-TR';
      setLocale(def);
    }
    if (comm) {
      const localeRows = s?.locales?.length ? s.locales : [{ locale: s?.locale || 'tr-TR' }];
      const emailTemplates:any = { ...(comm.emailTemplates || {}) };
      for (const [eventKey] of events) {
        emailTemplates[eventKey] = { ...(emailTemplates[eventKey] || {}) };
        for (const row of localeRows) {
          const loc = String(row.locale || 'tr-TR');
          emailTemplates[eventKey][loc] = normalizeTemplate(emailTemplates[eventKey][loc], eventKey, loc);
        }
      }
      setData({ ...comm, emailTemplates });
    }
    if (c.ok) setSender(await c.json());
    if (d.ok) {
      const j = await d.json();
      setProducts(Array.isArray(j) ? j : j?.items || []);
    }
    if (e.ok) {
      const j = await e.json();
      setCategories(Array.isArray(j) ? j : j?.items || []);
    }
    if (f.ok) {
      const j = await f.json();
      setPages(Array.isArray(j) ? j : j?.items || []);
    }
  }, [headers, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const locales = useMemo(() => (store?.locales?.length ? store.locales : [{ locale: store?.locale || 'tr-TR', label: 'Varsayılan' }]), [store]);
  const fallback = useMemo(() => baseTemplate(event, locale), [event, locale]);
  const current = useMemo(() => normalizeTemplate(data?.emailTemplates?.[event]?.[locale] || fallback, event, locale), [data, event, locale, fallback]);

  const setCurrent = useCallback(
    (patch: any) =>
      setData((d: any) => ({
        ...d,
        emailTemplates: {
          ...(d.emailTemplates || {}),
          [event]: {
            ...(d.emailTemplates?.[event] || {}),
            [locale]: {
              ...(d.emailTemplates?.[event]?.[locale] || fallback),
              ...patch,
            },
          },
        },
      })),
    [event, locale, fallback],
  );

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const r = await fetch(`${API}/admin/store-settings/${storeId}/communication`, {
        method: 'PATCH',
        credentials: 'include',
        headers: headers(true),
        body: JSON.stringify(data),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(Array.isArray(j?.message) ? j.message.join(', ') : j?.message || 'Kaydedilemedi');
      setData(j);
      setMessage('E-posta şablonları kaydedildi.');
    } catch (e: any) {
      setMessage(e?.message || 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const refreshPreview = useCallback(
    async (open = true) => {
      if (!storeId || !data) return;
      setPreviewing(true);
      try {
        const r = await fetch(`${API}/admin/email/templates/preview`, {
          method: 'POST',
          credentials: 'include',
          headers: headers(true),
          body: JSON.stringify({ storeId, event, locale, template: current }),
        });
        const j = await r.json().catch(() => ({}));
        setPreview(r.ok ? j.html || '' : `<div style="padding:24px;font-family:sans-serif">Önizleme oluşturulamadı: ${String(j?.message || r.status)}</div>`);
        if (open) setPreviewOpen(true);
      } finally {
        setPreviewing(false);
      }
    },
    [storeId, data, headers, event, locale, current],
  );

  useEffect(() => {
    if (current?.editorMode !== 'HTML' || !storeId || !data) return;
    const timer = window.setTimeout(() => {
      void refreshPreview(false);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [current?.editorMode, current?.html, current?.subject, current?.preheader, current?.design, event, locale, refreshPreview, storeId, data]);

  const switchToHtml = async () => {
    if (current.editorMode === 'HTML') return;
    if (String(current.html || '').trim()) {
      setCurrent({ editorMode: 'HTML' });
      return;
    }
    setPreviewing(true);
    setMessage('');
    try {
      const r = await fetch(`${API}/admin/email/templates/preview`, {
        method: 'POST', credentials: 'include', headers: headers(true),
        body: JSON.stringify({ storeId, event, locale, template: { ...current, editorMode: 'VISUAL' }, source: true }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || 'HTML oluşturulamadı');
      setCurrent({ editorMode: 'HTML', html: j.sourceHtml || j.html || '' });
      setPreview(j.html || '');
    } catch (e:any) {
      setMessage(e?.message || 'HTML oluşturulamadı');
    } finally {
      setPreviewing(false);
    }
  };

  const sendTest = async () => {
    if (!testTo.trim()) return;
    setTesting(true);
    setMessage('');
    try {
      const r = await fetch(`${API}/admin/email/templates/test`, {
        method: 'POST',
        credentials: 'include',
        headers: headers(true),
        body: JSON.stringify({ storeId, event, locale, to: testTo.trim(), template: current }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || 'Test e-postası gönderilemedi');
      setMessage(`Test e-postası gönderildi: ${testTo.trim()}`);
    } catch (e: any) {
      setMessage(e?.message || 'Test e-postası gönderilemedi');
    } finally {
      setTesting(false);
    }
  };

  if (!data) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  const currentDesign: EmailTemplateDesign = { ...defaultEmailDesign(), ...(current.design || {}) };

  return (
    <>
      <Container className="py-4">
        <div className="flex flex-wrap items-center gap-3 border-b pb-4">
          <Button size="icon" variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-mono">E-posta Şablonları</h1>
            <p className="text-sm text-muted-foreground">E-postayı doğrudan görünüm üzerinde tasarlayın, HTML düzenleyin ve test gönderin.</p>
          </div>
          <Button variant="outline" onClick={() => void refreshPreview(true)} disabled={previewing}>
            {previewing ? <LoaderCircle className="animate-spin" /> : <Eye />}
            Gerçek önizleme
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
            Kaydet
          </Button>
        </div>
      </Container>

      {message ? (
        <Container>
          <div className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${message.includes('gönderildi') || message.includes('kaydedildi') ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
            {message.includes('gönderildi') || message.includes('kaydedildi') ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
            {message}
          </div>
        </Container>
      ) : null}

      <Container className="grid gap-4 pb-8">
        <Card>
          <CardContent className="grid gap-4 p-4 xl:grid-cols-[minmax(220px,1.2fr)_minmax(180px,.8fr)_minmax(260px,1fr)_auto] xl:items-end">
            <FormField label="Otomatik e-posta">
              <select className="h-10 w-full rounded-md border bg-background px-3" value={event} onChange={(e) => setEvent(e.target.value)}>
                {events.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Dil">
              <Tabs value={locale} onValueChange={setLocale}>
                <TabsList>
                  {locales.map((l: any) => (
                    <TabsTrigger key={l.locale} value={l.locale}>
                      {l.label || l.locale}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </FormField>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <FormField label="Test e-postası">
                <Input type="email" placeholder="ornek@domain.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
              </FormField>
              <Button className="self-end" variant="outline" disabled={!testTo.trim() || testing} onClick={() => void sendTest()}>
                {testing ? <LoaderCircle className="animate-spin" /> : <Send />}
                Gönder
              </Button>
            </div>

            <label className="flex h-10 items-center gap-2 whitespace-nowrap text-sm font-medium">
              <Switch checked={current.enabled !== false} onCheckedChange={(v) => setCurrent({ enabled: v })} />
              Aktif
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 p-4 md:grid-cols-2">
            <FormField label="E-posta konusu" required>
              <Input value={current.subject || ''} onChange={(e) => setCurrent({ subject: e.target.value })} />
            </FormField>
            <FormField label="Preheader" hint="Gelen kutusunda konu yanında görünür">
              <Input value={current.preheader || ''} onChange={(e) => setCurrent({ preheader: e.target.value })} />
            </FormField>
            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
              <div className="text-sm">
                <span className="font-medium">Gönderen:</span> {sender?.senderName || store?.name || 'Mağaza'} <span className="text-muted-foreground">· {sender?.senderAddress || 'Sistem adresi'}</span>
              </div>
              <div className="flex gap-2">
                <Button variant={current.editorMode !== 'HTML' ? 'primary' : 'outline'} onClick={() => setCurrent({ editorMode: 'VISUAL' })}>
                  <Blocks />
                  Görsel tasarım
                </Button>
                <Button variant={current.editorMode === 'HTML' ? 'primary' : 'outline'} onClick={() => void switchToHtml()} disabled={previewing}>
                  <Code2 />
                  HTML
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {current.editorMode === 'HTML' ? (
          <Card>
            <CardContent className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="grid gap-3">
                <div className="text-sm text-muted-foreground">
                  Görsel tasarımın HTML'i otomatik olarak buraya alınır. İsterseniz düzenleyebilir veya tamamen sıfırdan HTML yazabilirsiniz. Sistem değişkenleri: <code>{'{{store_name}}'}</code>, <code>{'{{customer_name}}'}</code>, <code>{'{{order_no}}'}</code>, <code>{'{{order_total}}'}</code>, <code>{'{{order_url}}'}</code>.
                </div>
                <Textarea className="min-h-[780px] font-mono text-xs" value={current.html || ''} onChange={(e) => setCurrent({ html: e.target.value })} />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Canlı HTML önizleme</div>
                  <Button variant="outline" size="sm" onClick={() => void refreshPreview(false)} disabled={previewing}>
                    {previewing ? <LoaderCircle className="animate-spin" /> : <Eye />}
                    Yenile
                  </Button>
                </div>
                <div className="overflow-hidden rounded-xl border bg-muted p-3">
                  <iframe title="HTML e-posta önizleme" className="min-h-[760px] w-full rounded-lg bg-white" srcDoc={preview || current.html || '<div style="padding:24px;font-family:Arial">Önizleme burada görünecek.</div>'} />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <VisualEmailBuilder
            value={(Array.isArray(current.blocks) ? current.blocks : []) as VisualEmailBlock[]}
            onChange={(blocks) => setCurrent({ blocks })}
            products={products}
            categories={categories}
            pages={pages}
            store={{
              name: store?.name,
              logoUrl: store?.logoUrl,
              currency: store?.currency,
              email: store?.email,
              phone: store?.phone,
              companyName: store?.companyName,
              addressText: store?.addressText,
              mersisNo: store?.general?.invoice?.mersisNo || store?.settings?.general?.invoice?.mersisNo || '',
              senderEmail: sender?.senderAddress || '',
              privacyUrl: store?.general?.privacyUrl || store?.settings?.general?.privacyUrl || (store?.domain ? `https://${store.domain}/pages/privacy-policy` : ''),
            }}
            design={currentDesign}
            onDesignChange={(design) => setCurrent({ design })}
            locale={locale}
          />
        )}
      </Container>

      {previewOpen ? (
        <div className="fixed inset-0 z-[100] bg-black/50 p-4 md:p-8">
          <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-xl bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <div className="font-semibold">Gerçek HTML önizleme</div>
                <div className="text-xs text-muted-foreground">Test mail ile aynı server-side renderer kullanılır.</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setPreviewOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 bg-muted p-4">
              <iframe title="E-posta önizleme" sandbox="" className="h-full w-full rounded-lg border bg-white" srcDoc={preview} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
