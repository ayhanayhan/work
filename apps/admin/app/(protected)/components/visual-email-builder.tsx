'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Blocks,
  ChevronDown,
  ChevronUp,
  Code2,
  Columns2,
  Copy,
  GripVertical,
  Heading,
  Image as ImageIcon,
  Minus,
  MousePointerClick,
  Menu,
  Paintbrush2,
  PanelBottom,
  PanelTop,
  Plus,
  ReceiptText,
  Settings2,
  ShoppingBag,
  Space,
  Text,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MediaLibraryDialog } from '@/app/(protected)/components/media-library-dialog';
import { FormField } from './marketing-form-ui';

export type VisualEmailBlock = {
  id: string;
  type:
    | 'HEADER'
    | 'HEADING'
    | 'TEXT'
    | 'IMAGE'
    | 'COLUMNS'
    | 'BUTTON'
    | 'DIVIDER'
    | 'SPACER'
    | 'ORDER_SUMMARY'
    | 'PRODUCT_GRID'
    | 'MENU'
    | 'FOOTER';
  content: Record<string, any>;
  settings: Record<string, any>;
};

export type EmailBuilderProduct = {
  id: string;
  title: string;
  slug?: string;
  images?: { url?: string; alt?: string }[];
  variants?: { price?: any; comparePrice?: any }[];
  categoryId?: string;
  categoryIds?: string[];
  categories?: any[];
  totalSold?: number;
  orderCount?: number;
  salesCount?: number;
  publishedAt?: string;
  createdAt?: string;
};

export type EmailBuilderCategory = { id: string; name?: string; title?: string; slug?: string };
export type EmailBuilderPage = { id: string; title?: string; slug?: string; status?: string; translations?: any[] };
export type EmailBuilderStore = { name?: string; logoUrl?: string; currency?: string; email?: string; phone?: string; companyName?: string; addressText?: string; mersisNo?: string; senderEmail?: string; privacyUrl?: string };
export type EmailTemplateDesign = {
  fontFamily: string;
  bodyBackground: string;
  contentBackground: string;
  textColor: string;
  headingColor: string;
  primaryColor: string;
  contentRadius: number;
  buttonRadius: number;
};

export const defaultEmailDesign = (): EmailTemplateDesign => ({
  fontFamily: 'Arial, Helvetica, sans-serif',
  bodyBackground: '#f3f4f6',
  contentBackground: '#ffffff',
  textColor: '#111827',
  headingColor: '#111827',
  primaryColor: '#1937a7',
  contentRadius: 12,
  buttonRadius: 8,
});

export const defaultLegalFooterHtml = (locale = 'tr-TR') => {
  const code = String(locale || 'tr').toLowerCase().split(/[-_]/)[0];
  if (code === 'en') return `<p>If you prefer not to receive campaign and promotional emails from <strong>{{store_name}}</strong>, please <a href="{{unsubscribe_url}}">unsubscribe here</a>.</p><p>This email was sent to <a href="mailto:{{recipient_email}}">{{recipient_email}}</a> because this address is registered in the lawful communication database of <strong>{{store_name}}</strong>. To help our emails reach your inbox, you may add <a href="mailto:{{sender_email}}">{{sender_email}}</a> to your address book.</p><p>For questions, you can contact us at {{support_phone}} or <a href="mailto:{{support_email}}">{{support_email}}</a>. We respect your privacy and do not share your personal information except where required to provide our services or by law. You can review our <a href="{{privacy_url}}">Privacy Policy</a>.</p><p><strong>{{company_name}}</strong>{{store_address}}<br>{{mersis_label}}{{mersis_no}} · © {{year}}</p>`;
  if (code === 'pt') return `<p>Se não quiser receber campanhas e comunicações promocionais da <strong>{{store_name}}</strong>, <a href="{{unsubscribe_url}}">clique aqui para cancelar a subscrição</a>.</p><p>Este e-mail foi enviado para <a href="mailto:{{recipient_email}}">{{recipient_email}}</a> porque este endereço está registado na base de comunicações autorizadas da <strong>{{store_name}}</strong>. Para receber as nossas mensagens corretamente, pode adicionar <a href="mailto:{{sender_email}}">{{sender_email}}</a> aos seus contactos.</p><p>Para dúvidas, contacte-nos através de {{support_phone}} ou <a href="mailto:{{support_email}}">{{support_email}}</a>. Respeitamos a sua privacidade e não partilhamos os seus dados pessoais, exceto quando necessário para prestar os nossos serviços ou por obrigação legal. Consulte a nossa <a href="{{privacy_url}}">Política de Privacidade</a>.</p><p><strong>{{company_name}}</strong>{{store_address}}<br>{{mersis_label}}{{mersis_no}} · © {{year}}</p>`;
  if (code === 'ru') return `<p>Если вы не хотите получать рекламные и информационные письма от <strong>{{store_name}}</strong>, <a href="{{unsubscribe_url}}">отпишитесь здесь</a>.</p><p>Это письмо отправлено на адрес <a href="mailto:{{recipient_email}}">{{recipient_email}}</a>, поскольку он зарегистрирован в законной базе коммуникаций <strong>{{store_name}}</strong>. Чтобы наши письма корректно попадали во входящие, добавьте <a href="mailto:{{sender_email}}">{{sender_email}}</a> в адресную книгу.</p><p>По вопросам свяжитесь с нами: {{support_phone}} или <a href="mailto:{{support_email}}">{{support_email}}</a>. Мы уважаем вашу конфиденциальность и не передаём персональные данные, кроме случаев, необходимых для оказания услуг или предусмотренных законом. Ознакомьтесь с нашей <a href="{{privacy_url}}">Политикой конфиденциальности</a>.</p><p><strong>{{company_name}}</strong>{{store_address}}<br>{{mersis_label}}{{mersis_no}} · © {{year}}</p>`;
  return `<p><strong>{{store_name}}</strong> kampanya ve tanıtım e-postalarından haberdar olmayı tercih etmiyorsanız <a href="{{unsubscribe_url}}">buraya tıklayarak pazarlama e-postalarından ayrılabilirsiniz</a>.</p><p>Bu e-posta, <a href="mailto:{{recipient_email}}">{{recipient_email}}</a> adresi <strong>{{store_name}}</strong> yasal iletişim veritabanında kayıtlı olduğu için gönderilmiştir. Gönderimlerimizin e-posta kutunuza sorunsuz ulaşması için <a href="mailto:{{sender_email}}">{{sender_email}}</a> adresini adres defterinize ekleyebilirsiniz.</p><p>Sorularınız için {{support_phone}} veya <a href="mailto:{{support_email}}">{{support_email}}</a> üzerinden bize ulaşabilirsiniz. Gizliliğinize önem veriyoruz; kişisel bilgilerinizi hizmetin sunulması veya yasal zorunluluklar dışında paylaşmayız. <a href="{{privacy_url}}">Gizlilik Politikamızı</a> inceleyebilirsiniz.</p><p><strong>{{company_name}}</strong>{{store_address}}<br>{{mersis_label}}{{mersis_no}} · © {{year}}</p>`;
};

const makeId = () => `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const emailBlockDefault = (type: VisualEmailBlock['type']): VisualEmailBlock => ({
  id: makeId(),
  type,
  content:
    type === 'HEADER'
      ? { logoUrl: '', showLogo: true }
      : type === 'HEADING'
        ? { text: 'Siparişinizle ilgili güncelleme' }
        : type === 'TEXT'
          ? { text: 'Merhaba {{customer_name}},\n\nMesajınızı buraya yazın.' }
          : type === 'IMAGE'
            ? { url: '', alt: '', linkUrl: '' }
            : type === 'COLUMNS'
              ? { left: 'Sol kolon içeriği', right: 'Sağ kolon içeriği' }
              : type === 'BUTTON'
                ? { text: 'Siparişimi görüntüle', url: '{{order_url}}' }
                : type === 'PRODUCT_GRID'
                  ? {
                      title: 'Sizin için seçtiklerimiz',
                      source: 'BEST_SELLERS',
                      limit: 4,
                      columns: 2,
                      productIds: [],
                      categoryId: '',
                      showCategory: true,
                      showTitle: true,
                      showPrice: true,
                      showButton: true,
                      buttonText: 'Ürünü incele',
                    }
                  : type === 'MENU'
                    ? { items: [], style: 'SIMPLE', separator: ' · ', fontSize: 14 }
                  : type === 'FOOTER'
                    ? { text: '© {{year}} {{store_name}}', legalHtml: '', showUnsubscribe: true, showLogo: true, logoUrl: '', logoPosition: 'center', showSocials: false, socialPosition: 'center', socialLinks: { instagram: '', facebook: '', x: '', tiktok: '', youtube: '', linkedin: '' }, showContact: true, contactPosition: 'center', contactPhone: '', contactEmail: '', contactWebsite: '' }
                    : {},
  settings: {
    align: type === 'HEADER' || type === 'FOOTER' ? 'center' : 'left',
    padding: 16,
    background: '#ffffff',
    textColor: '#111827',
    buttonColor: '#1937a7',
    radius: type === 'BUTTON' ? 8 : undefined,
    height: type === 'SPACER' ? 24 : undefined,
  },
});

const palette: [VisualEmailBlock['type'], string, any, string][] = [
  ['HEADER', 'Logo / Header', PanelTop, 'Logo veya mağaza adı'],
  ['HEADING', 'Başlık', Heading, 'Büyük metin başlığı'],
  ['TEXT', 'Metin', Text, 'Açıklama ve değişkenler'],
  ['IMAGE', 'Görsel / Banner', ImageIcon, 'Medya kütüphanesinden görsel'],
  ['ORDER_SUMMARY', 'Sipariş Özeti', ReceiptText, 'Ürün satırları ve toplam'],
  ['PRODUCT_GRID', 'Ürünler', ShoppingBag, 'Kategori, çok satan, yeni veya manuel seçim'],
  ['MENU', 'Menü', Menu, 'Kategori, sayfa veya özel bağlantı ekle'],
  ['COLUMNS', '2 Kolon', Columns2, 'İki kolon içerik'],
  ['BUTTON', 'Buton', MousePointerClick, 'CTA bağlantısı'],
  ['DIVIDER', 'Ayraç', Minus, 'İnce ayırıcı'],
  ['SPACER', 'Boşluk', Space, 'Dikey boşluk'],
  ['FOOTER', 'Footer', PanelBottom, 'Footer ve unsubscribe'],
];

const fontOptions = [
  'Arial, Helvetica, sans-serif',
  'Inter, Arial, Helvetica, sans-serif',
  'Helvetica, Arial, sans-serif',
  'Verdana, Geneva, sans-serif',
  'Tahoma, Geneva, sans-serif',
  'Georgia, serif',
];

function money(value: any, currency = 'TRY') {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number.isFinite(n) ? n : 0);
  } catch {
    return `${Number.isFinite(n) ? n.toFixed(2) : '0.00'} ${currency}`;
  }
}

function imageOf(p: EmailBuilderProduct) {
  return p?.images?.find((x) => x?.url)?.url || '';
}

function productPrice(p: EmailBuilderProduct) {
  return p?.variants?.find((v) => v?.price != null)?.price ?? 0;
}

function comparePrice(p: EmailBuilderProduct) {
  return p?.variants?.find((v) => v?.comparePrice != null)?.comparePrice ?? null;
}

function categoryIdsOf(p: EmailBuilderProduct) {
  const ids = new Set<string>();
  if (p.categoryId) ids.add(String(p.categoryId));
  for (const id of Array.isArray(p.categoryIds) ? p.categoryIds : []) if (id) ids.add(String(id));
  for (const row of Array.isArray((p as any).categories) ? (p as any).categories : []) {
    if (row?.id) ids.add(String(row.id));
    if (row?.categoryId) ids.add(String(row.categoryId));
    if (row?.category?.id) ids.add(String(row.category.id));
  }
  return [...ids];
}

function categoryLabelOf(p: EmailBuilderProduct, categories: EmailBuilderCategory[]) {
  const ids = categoryIdsOf(p);
  const map = new Map(categories.map((x) => [String(x.id), x.name || x.title || 'Kategori']));
  for (const id of ids) {
    if (map.has(id)) return map.get(id) || '';
  }
  const first = Array.isArray((p as any).categories) ? (p as any).categories[0] : null;
  return first?.title || first?.name || first?.category?.title || first?.category?.name || '';
}

function sortProducts(source: string, items: EmailBuilderProduct[]) {
  const list = [...items];
  if (source === 'LATEST') {
    return list.sort((a: any, b: any) => new Date(b.publishedAt || b.createdAt || 0).getTime() - new Date(a.publishedAt || a.createdAt || 0).getTime());
  }
  if (source === 'BEST_SELLERS') {
    return list.sort((a: any, b: any) => {
      const av = Number(a.totalSold ?? a.salesCount ?? a.orderCount ?? 0);
      const bv = Number(b.totalSold ?? b.salesCount ?? b.orderCount ?? 0);
      return bv - av;
    });
  }
  if (source === 'RANDOM') {
    return list.sort(() => Math.random() - 0.5);
  }
  return list;
}

function resolveProducts(block: VisualEmailBlock, products: EmailBuilderProduct[]) {
  const c = block.content || {};
  const limit = Math.max(1, Math.min(8, Number(c.limit) || 4));
  const source = String(c.source || 'BEST_SELLERS').toUpperCase();

  if (source === 'MANUAL') {
    const ids: string[] = Array.isArray(c.productIds) ? c.productIds.map(String) : [];
    return ids.map((pid) => products.find((p) => String(p.id) === pid)).filter(Boolean).slice(0, limit) as EmailBuilderProduct[];
  }

  if (source === 'CATEGORY' && c.categoryId) {
    const filtered = products.filter((p) => categoryIdsOf(p).includes(String(c.categoryId)));
    return filtered.slice(0, limit);
  }

  const sorted = sortProducts(source, products);
  return sorted.slice(0, limit);
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function VisualEmailBuilder({
  value,
  onChange,
  products = [],
  categories = [],
  pages = [],
  store,
  design,
  onDesignChange,
  locale = 'tr-TR',
}: {
  value: VisualEmailBlock[];
  onChange: (v: VisualEmailBlock[]) => void;
  products?: EmailBuilderProduct[];
  categories?: EmailBuilderCategory[];
  pages?: EmailBuilderPage[];
  store?: EmailBuilderStore;
  design?: EmailTemplateDesign;
  onDesignChange?: (v: EmailTemplateDesign) => void;
  locale?: string;
}) {
  const blocks = Array.isArray(value) ? value : [];
  const activeDesign = design || defaultEmailDesign();
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<'modules' | 'settings' | 'design'>('modules');
  const [productQuery, setProductQuery] = useState('');
  const [mediaPicker, setMediaPicker] = useState<{ blockId: string; field: string; title: string } | null>(null);
  const [menuItemType, setMenuItemType] = useState<'CATEGORY' | 'PAGE' | 'ACCOUNT' | 'CUSTOM'>('CATEGORY');
  const [menuSelectedValue, setMenuSelectedValue] = useState('');
  const [menuCustomLabel, setMenuCustomLabel] = useState('');
  const [menuCustomUrl, setMenuCustomUrl] = useState('');
  const selectedBlock = blocks.find((x) => x.id === selected) || null;

  const add = (type: VisualEmailBlock['type'], at = blocks.length) => {
    const block = emailBlockDefault(type);
    const next = [...blocks];
    next.splice(Math.max(0, Math.min(at, next.length)), 0, block);
    onChange(next);
    setSelected(block.id);
    setPanel('settings');
  };

  const move = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) return;
    const next = [...blocks];
    const [block] = next.splice(from, 1);
    next.splice(to, 0, block);
    onChange(next);
  };

  const moveBefore = (bid: string, targetId: string) => {
    const from = blocks.findIndex((x) => x.id === bid);
    const target = blocks.findIndex((x) => x.id === targetId);
    if (from < 0 || target < 0 || from === target) return;
    const next = [...blocks];
    const [block] = next.splice(from, 1);
    const adjusted = from < target ? target - 1 : target;
    next.splice(adjusted, 0, block);
    onChange(next);
  };

  const update = (bid: string, part: 'content' | 'settings', patch: any) => {
    onChange(blocks.map((b) => (b.id === bid ? { ...b, [part]: { ...b[part], ...patch } } : b)));
  };

  const remove = (bid: string) => {
    const next = blocks.filter((b) => b.id !== bid);
    onChange(next);
    if (selected === bid) {
      setSelected(null);
      setPanel('modules');
    }
  };

  const duplicate = (b: VisualEmailBlock) => {
    const index = blocks.findIndex((x) => x.id === b.id);
    const clone = { ...b, id: makeId(), content: { ...b.content }, settings: { ...b.settings } };
    const next = [...blocks];
    next.splice(index + 1, 0, clone);
    onChange(next);
    setSelected(clone.id);
    setPanel('settings');
  };

  const select = (bid: string) => {
    setSelected(bid);
    setPanel('settings');
  };

  const productOptions = useMemo(() => {
    const q = productQuery.toLocaleLowerCase('tr-TR');
    return products.filter((p) => !q || String(p.title || '').toLocaleLowerCase('tr-TR').includes(q)).slice(0, 60);
  }, [products, productQuery]);

  const sidebarTitle =
    panel === 'modules'
      ? 'Modüller'
      : panel === 'design'
        ? 'Genel ayarlar'
        : palette.find((x) => x[0] === selectedBlock?.type)?.[1] || 'Modül ayarları';

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="h-fit overflow-hidden rounded-xl border bg-background xl:sticky xl:top-4">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          {panel !== 'modules' && (
            <Button size="icon" variant="ghost" onClick={() => setPanel('modules')}>
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{sidebarTitle}</div>
            <div className="text-xs text-muted-foreground">
              {panel === 'modules'
                ? 'Elementor benzeri modül listesi'
                : panel === 'design'
                  ? 'Yazı tipi, renkler ve genel görünüm'
                  : 'Seçili alanın görünüm ve içerik ayarları'}
            </div>
          </div>
          {panel === 'modules' ? (
            <Button size="sm" variant="outline" onClick={() => setPanel('design')}>
              <Paintbrush2 className="size-4" />
              Genel ayar
            </Button>
          ) : null}
          {panel === 'settings' ? (
            <Button size="sm" variant="outline" onClick={() => setPanel('modules')}>
              <Plus className="size-4" />
              Modül ekle
            </Button>
          ) : null}
        </div>

        <div className="max-h-[calc(100vh-190px)] overflow-auto p-4">
          {panel === 'modules' ? (
            <div className="grid grid-cols-1 gap-2">
              {palette.map(([type, label, Icon, desc]) => (
                <button
                  key={type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-email-block', type);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => add(type)}
                  className="rounded-lg border bg-background p-3 text-left transition hover:border-primary hover:bg-muted/40"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="size-4" />
                    {label}
                  </span>
                  <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{desc}</span>
                </button>
              ))}
            </div>
          ) : panel === 'design' ? (
            <div className="grid gap-4">
              <FormField label="Yazı tipi">
                <select
                  className="h-10 w-full rounded-md border bg-background px-3"
                  value={activeDesign.fontFamily}
                  onChange={(e) => onDesignChange?.({ ...activeDesign, fontFamily: e.target.value })}
                >
                  {fontOptions.map((font) => (
                    <option key={font} value={font}>
                      {font.split(',')[0]}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Sayfa zemini">
                  <Input type="color" value={activeDesign.bodyBackground} onChange={(e) => onDesignChange?.({ ...activeDesign, bodyBackground: e.target.value })} />
                </FormField>
                <FormField label="E-posta zemini">
                  <Input type="color" value={activeDesign.contentBackground} onChange={(e) => onDesignChange?.({ ...activeDesign, contentBackground: e.target.value })} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Genel metin rengi">
                  <Input type="color" value={activeDesign.textColor} onChange={(e) => onDesignChange?.({ ...activeDesign, textColor: e.target.value })} />
                </FormField>
                <FormField label="Başlık rengi">
                  <Input type="color" value={activeDesign.headingColor} onChange={(e) => onDesignChange?.({ ...activeDesign, headingColor: e.target.value })} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Ana renk / buton">
                  <Input type="color" value={activeDesign.primaryColor} onChange={(e) => onDesignChange?.({ ...activeDesign, primaryColor: e.target.value })} />
                </FormField>
                <FormField label="Kart köşe radius">
                  <Input
                    type="number"
                    min={0}
                    max={40}
                    value={activeDesign.contentRadius}
                    onChange={(e) => onDesignChange?.({ ...activeDesign, contentRadius: Number(e.target.value) || 0 })}
                  />
                </FormField>
              </div>
              <FormField label="Buton radius">
                <Input
                  type="number"
                  min={0}
                  max={40}
                  value={activeDesign.buttonRadius}
                  onChange={(e) => onDesignChange?.({ ...activeDesign, buttonRadius: Number(e.target.value) || 0 })}
                />
              </FormField>
            </div>
          ) : !selectedBlock ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Tuvalde bir modül seçin.</div>
          ) : (
            <div className="grid gap-4">
              {selectedBlock.type === 'HEADER' ? (
                <>
                  <ToggleRow label="Header logosu göster" checked={selectedBlock.content.showLogo !== false} onChange={(v) => update(selectedBlock.id, 'content', { showLogo: v })} />
                  {selectedBlock.content.showLogo !== false ? <FormField label="Header logosu">
                    <div className="grid gap-2">
                      {(selectedBlock.content.logoUrl || store?.logoUrl) ? <img src={selectedBlock.content.logoUrl || store?.logoUrl} alt="Header logo" className="max-h-20 max-w-[220px] rounded border object-contain" /> : <div className="rounded border border-dashed p-5 text-center text-xs text-muted-foreground">Mağaza logosu yok · mağaza adı metin olarak kullanılacak</div>}
                      <div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setMediaPicker({ blockId: selectedBlock.id, field: 'logoUrl', title: 'Header logosu seç' })}>Medya Kütüphanesinden Seç</Button>{selectedBlock.content.logoUrl ? <Button type="button" size="sm" variant="ghost" onClick={() => update(selectedBlock.id, 'content', { logoUrl: '' })}>Mağaza logosunu kullan</Button> : null}</div>
                    </div>
                  </FormField> : null}
                  <p className="text-xs text-muted-foreground">Mağaza logosu varsa seçilmiş medya gibi görünür. İsterseniz başka logo seçebilir veya logo gösterimini kapatıp mağaza adını kullanabilirsiniz.</p>
                </>
              ) : null}

              {['HEADING', 'TEXT'].includes(selectedBlock.type) ? (
                <FormField label={selectedBlock.type === 'HEADING' ? 'Başlık' : 'Metin'}>
                  <Textarea
                    rows={selectedBlock.type === 'TEXT' ? 8 : 3}
                    value={selectedBlock.content.text || ''}
                    onChange={(e) => update(selectedBlock.id, 'content', { text: e.target.value })}
                  />
                </FormField>
              ) : null}

              {selectedBlock.type === 'IMAGE' ? (
                <>
                  <FormField label="Banner / görsel">
                    <div className="grid gap-3">
                      {selectedBlock.content.url ? <img src={selectedBlock.content.url} alt={selectedBlock.content.alt || ''} className="max-h-52 w-full rounded-lg border object-contain" /> : <div className="grid min-h-36 place-items-center rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground">Henüz görsel seçilmedi</div>}
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setMediaPicker({ blockId: selectedBlock.id, field: 'url', title: 'Banner görseli seç' })}>Medya Kütüphanesinden Seç</Button>
                        {selectedBlock.content.url ? <Button type="button" variant="ghost" onClick={() => update(selectedBlock.id, 'content', { url: '' })}>Kaldır</Button> : null}
                      </div>
                    </div>
                  </FormField>
                  <FormField label="Alt metin">
                    <Input value={selectedBlock.content.alt || ''} onChange={(e) => update(selectedBlock.id, 'content', { alt: e.target.value })} />
                  </FormField>
                  <FormField label="Tıklama URL'si">
                    <Input placeholder="https://..." value={selectedBlock.content.linkUrl || ''} onChange={(e) => update(selectedBlock.id, 'content', { linkUrl: e.target.value })} />
                  </FormField>
                </>
              ) : null}

              {selectedBlock.type === 'COLUMNS' ? (
                <>
                  <FormField label="Sol kolon">
                    <Textarea rows={5} value={selectedBlock.content.left || ''} onChange={(e) => update(selectedBlock.id, 'content', { left: e.target.value })} />
                  </FormField>
                  <FormField label="Sağ kolon">
                    <Textarea rows={5} value={selectedBlock.content.right || ''} onChange={(e) => update(selectedBlock.id, 'content', { right: e.target.value })} />
                  </FormField>
                </>
              ) : null}

              {selectedBlock.type === 'BUTTON' ? (
                <>
                  <FormField label="Buton metni">
                    <Input value={selectedBlock.content.text || ''} onChange={(e) => update(selectedBlock.id, 'content', { text: e.target.value })} />
                  </FormField>
                  <FormField label="Bağlantı">
                    <Input value={selectedBlock.content.url || ''} onChange={(e) => update(selectedBlock.id, 'content', { url: e.target.value })} />
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Buton rengi">
                      <Input type="color" value={selectedBlock.settings.buttonColor || activeDesign.primaryColor} onChange={(e) => update(selectedBlock.id, 'settings', { buttonColor: e.target.value })} />
                    </FormField>
                    <FormField label="Buton radius">
                      <Input
                        type="number"
                        min={0}
                        max={40}
                        value={selectedBlock.settings.radius ?? activeDesign.buttonRadius}
                        onChange={(e) => update(selectedBlock.id, 'settings', { radius: Number(e.target.value) || 0 })}
                      />
                    </FormField>
                  </div>
                </>
              ) : null}

              {selectedBlock.type === 'PRODUCT_GRID' ? (
                <>
                  <FormField label="Başlık">
                    <Input value={selectedBlock.content.title || ''} onChange={(e) => update(selectedBlock.id, 'content', { title: e.target.value })} />
                  </FormField>
                  <FormField label="Ürün kaynağı">
                    <select className="h-10 w-full rounded-md border bg-background px-3" value={selectedBlock.content.source || 'BEST_SELLERS'} onChange={(e) => update(selectedBlock.id, 'content', { source: e.target.value })}>
                      <option value="BEST_SELLERS">Çok satan ürünler</option>
                      <option value="LATEST">Yeni ürünler</option>
                      <option value="CATEGORY">Kategoriden otomatik</option>
                      <option value="MANUAL">Ürünleri ben seçeyim</option>
                      <option value="RANDOM">Rastgele ürünler</option>
                    </select>
                  </FormField>
                  {selectedBlock.content.source === 'CATEGORY' ? (
                    <FormField label="Kategori">
                      <select className="h-10 w-full rounded-md border bg-background px-3" value={selectedBlock.content.categoryId || ''} onChange={(e) => update(selectedBlock.id, 'content', { categoryId: e.target.value })}>
                        <option value="">Kategori seç</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name || c.title || c.id}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  ) : null}
                  {selectedBlock.content.source === 'MANUAL' ? (
                    <div className="grid gap-3 rounded-lg border p-3">
                      <Input placeholder="Ürün ara" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} />
                      <div className="max-h-64 space-y-1 overflow-auto rounded-md border p-2">
                        {productOptions.map((p) => {
                          const ids = Array.isArray(selectedBlock.content.productIds) ? selectedBlock.content.productIds.map(String) : [];
                          const active = ids.includes(String(p.id));
                          return (
                            <label key={p.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/40">
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={(e) =>
                                  update(selectedBlock.id, 'content', {
                                    productIds: e.target.checked ? [...ids, String(p.id)] : ids.filter((x: string) => x !== String(p.id)),
                                  })
                                }
                              />
                              <span className="truncate">{p.title}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Ürün sayısı">
                      <Input type="number" min={1} max={8} value={selectedBlock.content.limit || 4} onChange={(e) => update(selectedBlock.id, 'content', { limit: Number(e.target.value) || 4 })} />
                    </FormField>
                    <FormField label="Kolon">
                      <select className="h-10 w-full rounded-md border bg-background px-3" value={String(selectedBlock.content.columns || 2)} onChange={(e) => update(selectedBlock.id, 'content', { columns: Number(e.target.value) || 2 })}>
                        <option value="1">1 kolon</option>
                        <option value="2">2 kolon</option>
                      </select>
                    </FormField>
                  </div>
                  <div className="grid gap-2">
                    <ToggleRow label="Kategori göster" checked={selectedBlock.content.showCategory !== false} onChange={(v) => update(selectedBlock.id, 'content', { showCategory: v })} />
                    <ToggleRow label="Başlık göster" checked={selectedBlock.content.showTitle !== false} onChange={(v) => update(selectedBlock.id, 'content', { showTitle: v })} />
                    <ToggleRow label="Fiyat göster" checked={selectedBlock.content.showPrice !== false} onChange={(v) => update(selectedBlock.id, 'content', { showPrice: v })} />
                    <ToggleRow label="Buton göster" checked={selectedBlock.content.showButton !== false} onChange={(v) => update(selectedBlock.id, 'content', { showButton: v })} />
                  </div>
                  {selectedBlock.content.showButton !== false ? (
                    <>
                      <FormField label="Ürün buton metni">
                        <Input value={selectedBlock.content.buttonText || 'Ürünü incele'} onChange={(e) => update(selectedBlock.id, 'content', { buttonText: e.target.value })} />
                      </FormField>
                      <FormField label="Ürün buton radius">
                        <Input type="number" min={0} max={40} value={selectedBlock.settings.radius ?? activeDesign.buttonRadius} onChange={(e) => update(selectedBlock.id, 'settings', { radius: Number(e.target.value) || 0 })} />
                      </FormField>
                    </>
                  ) : null}
                </>
              ) : null}

              {selectedBlock.type === 'MENU' ? (
                <div className="grid gap-2">
                  <div className="grid gap-2 rounded-lg border p-2.5">
                    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2">
                      <select
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                        value={menuItemType}
                        onChange={(e) => { setMenuItemType(e.target.value as any); setMenuSelectedValue(''); setMenuCustomLabel(''); setMenuCustomUrl(''); }}
                      >
                        <option value="CATEGORY">Kategori</option>
                        <option value="PAGE">Sabit sayfa</option>
                        <option value="ACCOUNT">Hesap sayfası</option>
                        <option value="CUSTOM">Custom URL</option>
                      </select>

                      {menuItemType === 'CATEGORY' ? (
                        <select className="h-9 min-w-0 rounded-md border bg-background px-2 text-sm" value={menuSelectedValue} onChange={(e) => setMenuSelectedValue(e.target.value)}>
                          <option value="">Kategori seçin</option>
                          {categories.map((x) => <option key={x.id} value={x.id}>{x.name || x.title || x.slug || x.id}</option>)}
                        </select>
                      ) : menuItemType === 'PAGE' ? (
                        <select className="h-9 min-w-0 rounded-md border bg-background px-2 text-sm" value={menuSelectedValue} onChange={(e) => setMenuSelectedValue(e.target.value)}>
                          <option value="">Sayfa seçin</option>
                          {pages.filter((x) => !x.status || x.status === 'PUBLISHED').map((x) => <option key={x.id} value={x.id}>{x.title || x.slug || x.id}</option>)}
                        </select>
                      ) : menuItemType === 'ACCOUNT' ? (
                        <select className="h-9 min-w-0 rounded-md border bg-background px-2 text-sm" value={menuSelectedValue} onChange={(e) => setMenuSelectedValue(e.target.value)}>
                          <option value="">Hesap sayfası seçin</option>
                          <option value="/account|Hesabım">Hesabım</option>
                          <option value="/account/orders|Siparişlerim">Siparişlerim</option>
                          <option value="/account/addresses|Adreslerim">Adreslerim</option>
                          <option value="/account/wishlist|Favorilerim">Favorilerim</option>
                          <option value="/account/profile|Profil bilgilerim">Profil bilgilerim</option>
                        </select>
                      ) : (
                        <Input className="h-9" placeholder="Menü başlığı" value={menuCustomLabel} onChange={(e) => setMenuCustomLabel(e.target.value)} />
                      )}
                    </div>

                    {menuItemType === 'CUSTOM' ? (
                      <div className="grid grid-cols-[minmax(0,1fr)_64px] gap-2">
                        <Input className="h-9" placeholder="https://... veya /sayfa" value={menuCustomUrl} onChange={(e) => setMenuCustomUrl(e.target.value)} />
                        <Button type="button" size="sm" className="h-9" disabled={!menuCustomLabel.trim() || !menuCustomUrl.trim()} onClick={() => {
                          const items = Array.isArray(selectedBlock.content.items) ? selectedBlock.content.items : [];
                          update(selectedBlock.id, 'content', { items: [...items, { id: `mi_${Date.now()}`, type: 'CUSTOM', label: menuCustomLabel.trim(), url: menuCustomUrl.trim() }] });
                          setMenuCustomLabel(''); setMenuCustomUrl('');
                        }}>Ekle</Button>
                      </div>
                    ) : (
                      <Button type="button" size="sm" className="h-9 w-full" disabled={!menuSelectedValue} onClick={() => {
                        const items = Array.isArray(selectedBlock.content.items) ? selectedBlock.content.items : [];
                        if (menuItemType === 'CATEGORY') {
                          const row = categories.find((x) => x.id === menuSelectedValue); if (!row) return;
                          update(selectedBlock.id, 'content', { items: [...items, { id: `mi_${Date.now()}`, type: 'CATEGORY', refId: row.id, label: row.name || row.title || row.slug || 'Kategori', slug: row.slug || '' }] });
                        } else if (menuItemType === 'PAGE') {
                          const row = pages.find((x) => x.id === menuSelectedValue); if (!row) return;
                          update(selectedBlock.id, 'content', { items: [...items, { id: `mi_${Date.now()}`, type: 'PAGE', refId: row.id, label: row.title || row.slug || 'Sayfa', slug: row.slug || '' }] });
                        } else {
                          const [url, label] = menuSelectedValue.split('|'); if (!url || !label) return;
                          update(selectedBlock.id, 'content', { items: [...items, { id: `mi_${Date.now()}`, type: 'ACCOUNT', label, url }] });
                        }
                        setMenuSelectedValue('');
                      }}>Menüye ekle</Button>
                    )}
                  </div>

                  <div className="grid gap-1.5">
                    {(Array.isArray(selectedBlock.content.items) ? selectedBlock.content.items : []).map((item:any, index:number, all:any[]) => <div key={item.id || `${item.type}-${index}`} className="flex h-9 items-center gap-1 rounded-md border px-2">
                      <div className="min-w-0 flex-1 truncate text-xs font-medium">{item.label || 'Menü öğesi'} <span className="font-normal text-muted-foreground">· {item.type === 'CATEGORY' ? 'Kategori' : item.type === 'PAGE' ? 'Sayfa' : item.type === 'ACCOUNT' ? 'Hesap' : 'URL'}</span></div>
                      <Button type="button" size="icon" className="size-7" variant="ghost" disabled={index===0} onClick={() => { const next=[...all]; [next[index-1],next[index]]=[next[index],next[index-1]]; update(selectedBlock.id,'content',{items:next}); }}><ChevronUp className="size-3.5"/></Button>
                      <Button type="button" size="icon" className="size-7" variant="ghost" disabled={index===all.length-1} onClick={() => { const next=[...all]; [next[index+1],next[index]]=[next[index],next[index+1]]; update(selectedBlock.id,'content',{items:next}); }}><ChevronDown className="size-3.5"/></Button>
                      <Button type="button" size="icon" className="size-7" variant="ghost" onClick={() => update(selectedBlock.id,'content',{items:all.filter((_:any,i:number)=>i!==index)})}><Trash2 className="size-3.5"/></Button>
                    </div>)}
                    {(!Array.isArray(selectedBlock.content.items) || selectedBlock.content.items.length===0) ? <div className="rounded-md border border-dashed px-2.5 py-2 text-[11px] text-muted-foreground">Türü seçin, öğeyi seçin ve menüye ekleyin.</div> : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="Stil"><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={selectedBlock.content.style || 'SIMPLE'} onChange={(e) => update(selectedBlock.id,'content',{style:e.target.value})}><option value="SIMPLE">Düz</option><option value="UNDERLINE">Altı çizgili</option><option value="PILLS">Pill</option><option value="BORDERED">Çerçeveli</option><option value="FULL_WIDTH">Tam genişlik</option></select></FormField>
                    <FormField label="Font"><Input className="h-9" type="number" min={10} max={28} value={selectedBlock.content.fontSize || 14} onChange={(e) => update(selectedBlock.id,'content',{fontSize:Number(e.target.value)||14})}/></FormField>
                    <FormField label="Arkaplan"><Input className="h-9" type="color" value={selectedBlock.settings.background || '#ffffff'} onChange={(e) => update(selectedBlock.id,'settings',{background:e.target.value})}/></FormField>
                    <FormField label="Metin"><Input className="h-9" type="color" value={selectedBlock.settings.textColor || activeDesign.textColor} onChange={(e) => update(selectedBlock.id,'settings',{textColor:e.target.value})}/></FormField>
                    <FormField label="Hizalama"><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={selectedBlock.settings.align || 'left'} onChange={(e) => update(selectedBlock.id,'settings',{align:e.target.value})}><option value="left">Sol</option><option value="center">Orta</option><option value="right">Sağ</option></select></FormField>
                    <FormField label="Boşluk"><Input className="h-9" type="number" min={0} max={40} value={selectedBlock.settings.padding ?? 16} onChange={(e) => update(selectedBlock.id,'settings',{padding:Number(e.target.value)||0})}/></FormField>
                  </div>
                </div>
              ) : null}

              {selectedBlock.type === 'ORDER_SUMMARY' ? (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">Sipariş özeti, gerçek gönderimde siparişten otomatik doldurulur. Tuvalde mağaza ürünleri ile örnek görünüm gösterilir.</div>
              ) : null}

              {selectedBlock.type === 'FOOTER' ? (
                <>
                  <div className="grid gap-3 rounded-lg border p-3">
                    <ToggleRow label="Footer logosu göster" checked={selectedBlock.content.showLogo === true} onChange={(v) => update(selectedBlock.id, 'content', { showLogo: v })} />
                    {selectedBlock.content.showLogo === true ? <>
                      <FormField label="Footer logosu">
                        <div className="grid gap-2">
                          {(selectedBlock.content.logoUrl || store?.logoUrl) ? <img src={selectedBlock.content.logoUrl || store?.logoUrl} alt="Footer logo" className="max-h-20 max-w-[220px] rounded border object-contain" /> : <div className="rounded border border-dashed p-5 text-center text-xs text-muted-foreground">Logo seçilmedi</div>}
                          <div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setMediaPicker({ blockId: selectedBlock.id, field: 'logoUrl', title: 'Footer logosu seç' })}>Medya Kütüphanesinden Seç</Button>{selectedBlock.content.logoUrl ? <Button type="button" size="sm" variant="ghost" onClick={() => update(selectedBlock.id, 'content', { logoUrl: '' })}>Mağaza logosunu kullan</Button> : null}</div>
                        </div>
                      </FormField>
                      <FormField label="Logo konumu"><select className="h-10 w-full rounded-md border bg-background px-3" value={selectedBlock.content.logoPosition || 'center'} onChange={(e) => update(selectedBlock.id, 'content', { logoPosition: e.target.value })}><option value="left">Sol</option><option value="center">Orta</option><option value="right">Sağ</option></select></FormField>
                    </> : null}
                  </div>

                  <div className="grid gap-3 rounded-lg border p-3">
                    <ToggleRow label="Sosyal medya bağlantıları göster" checked={selectedBlock.content.showSocials === true} onChange={(v) => update(selectedBlock.id, 'content', { showSocials: v })} />
                    {selectedBlock.content.showSocials === true ? <>
                      <FormField label="Sosyal medya konumu"><select className="h-10 w-full rounded-md border bg-background px-3" value={selectedBlock.content.socialPosition || 'center'} onChange={(e) => update(selectedBlock.id, 'content', { socialPosition: e.target.value })}><option value="left">Sol</option><option value="center">Orta</option><option value="right">Sağ</option></select></FormField>
                      {['instagram','facebook','x','tiktok','youtube','linkedin'].map((network) => <FormField key={network} label={network === 'x' ? 'X / Twitter' : network.charAt(0).toUpperCase()+network.slice(1)}><Input placeholder="https://..." value={selectedBlock.content.socialLinks?.[network] || ''} onChange={(e) => update(selectedBlock.id, 'content', { socialLinks: { ...(selectedBlock.content.socialLinks || {}), [network]: e.target.value } })} /></FormField>)}
                    </> : null}
                  </div>

                  <div className="grid gap-3 rounded-lg border p-3">
                    <ToggleRow label="İletişim bilgilerini göster" checked={selectedBlock.content.showContact !== false} onChange={(v) => update(selectedBlock.id, 'content', { showContact: v })} />
                    {selectedBlock.content.showContact !== false ? <>
                      <FormField label="İletişim konumu"><select className="h-10 w-full rounded-md border bg-background px-3" value={selectedBlock.content.contactPosition || 'center'} onChange={(e) => update(selectedBlock.id, 'content', { contactPosition: e.target.value })}><option value="left">Sol</option><option value="center">Orta</option><option value="right">Sağ</option></select></FormField>
                      <FormField label="Telefon"><Input placeholder={store?.phone || '{{support_phone}}'} value={selectedBlock.content.contactPhone || ''} onChange={(e) => update(selectedBlock.id, 'content', { contactPhone: e.target.value })} /></FormField>
                      <FormField label="E-posta"><Input placeholder={store?.email || '{{support_email}}'} value={selectedBlock.content.contactEmail || ''} onChange={(e) => update(selectedBlock.id, 'content', { contactEmail: e.target.value })} /></FormField>
                      <FormField label="Web sitesi"><Input placeholder="{{store_url}}" value={selectedBlock.content.contactWebsite || ''} onChange={(e) => update(selectedBlock.id, 'content', { contactWebsite: e.target.value })} /></FormField>
                    </> : null}
                  </div>

                  <FormField label="Yasal footer (HTML)">
                    <Textarea rows={16} className="font-mono text-xs" value={selectedBlock.content.legalHtml || defaultLegalFooterHtml(locale)} onChange={(e) => update(selectedBlock.id, 'content', { legalHtml: e.target.value })} />
                  </FormField>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => update(selectedBlock.id, 'content', { legalHtml: defaultLegalFooterHtml(locale) })}>Dil varsayılanını yükle</Button>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-[11px] leading-5 text-muted-foreground">Kullanılabilir değişkenler: {'{{store_name}}'}, {'{{store_url}}'}, {'{{recipient_email}}'}, {'{{sender_email}}'}, {'{{support_phone}}'}, {'{{support_email}}'}, {'{{privacy_url}}'}, {'{{company_name}}'}, {'{{store_address}}'}, {'{{mersis_no}}'}, {'{{year}}'}, {'{{unsubscribe_url}}'}.</div>
                </>
              ) : null}

              {selectedBlock.type === 'SPACER' ? (
                <FormField label="Yükseklik">
                  <Input type="number" min={8} max={160} value={selectedBlock.settings.height || 24} onChange={(e) => update(selectedBlock.id, 'settings', { height: Number(e.target.value) || 24 })} />
                </FormField>
              ) : null}

              {!['DIVIDER', 'SPACER', 'ORDER_SUMMARY', 'MENU'].includes(selectedBlock.type) ? (
                <>
                  <FormField label="Hizalama">
                    <select className="h-10 w-full rounded-md border bg-background px-3" value={selectedBlock.settings.align || 'left'} onChange={(e) => update(selectedBlock.id, 'settings', { align: e.target.value })}>
                      <option value="left">Sol</option>
                      <option value="center">Orta</option>
                      <option value="right">Sağ</option>
                    </select>
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Arkaplan">
                      <Input type="color" value={selectedBlock.settings.background || '#ffffff'} onChange={(e) => update(selectedBlock.id, 'settings', { background: e.target.value })} />
                    </FormField>
                    <FormField label="Metin">
                      <Input type="color" value={selectedBlock.settings.textColor || activeDesign.textColor} onChange={(e) => update(selectedBlock.id, 'settings', { textColor: e.target.value })} />
                    </FormField>
                  </div>
                  <FormField label="İç boşluk">
                    <Input type="number" min={0} max={80} value={selectedBlock.settings.padding ?? 16} onChange={(e) => update(selectedBlock.id, 'settings', { padding: Number(e.target.value) || 0 })} />
                  </FormField>
                </>
              ) : null}
            </div>
          )}
        </div>
      </aside>

      <section className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Canlı e-posta tasarımı</div>
            <div className="text-xs text-muted-foreground">Modülleri sürükleyip bırakın. Düzenlemek için doğrudan tasarımın üzerine tıklayın.</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPanel('design')}>
              <Paintbrush2 className="size-4" />
              Genel ayar
            </Button>
            <Button variant="outline" onClick={() => setPanel('modules')}>
              <Plus className="size-4" />
              Modül ekle
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border p-4 md:p-8" style={{ background: activeDesign.bodyBackground }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
          e.preventDefault();
          const type = e.dataTransfer.getData('application/x-email-block') as VisualEmailBlock['type'];
          if (type) add(type);
        }}>
          <div className="mx-auto min-h-[680px] max-w-[680px] overflow-hidden border shadow-sm" style={{ background: activeDesign.contentBackground, borderRadius: activeDesign.contentRadius }}>
            {blocks.length === 0 ? (
              <button onClick={() => setPanel('modules')} className="grid min-h-[680px] w-full place-items-center border-0 bg-white text-sm text-muted-foreground">
                <span className="rounded-lg border border-dashed px-8 py-10">+ İlk modülü ekleyin</span>
              </button>
            ) : null}
            {blocks.map((b, i) => (
              <div
                key={b.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-email-existing', b.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const type = e.dataTransfer.getData('application/x-email-block') as VisualEmailBlock['type'];
                  const existing = e.dataTransfer.getData('application/x-email-existing');
                  if (type) add(type, i);
                  else if (existing) moveBefore(existing, b.id);
                }}
                onClick={() => select(b.id)}
                className={`group relative cursor-pointer transition ${selected === b.id ? 'z-10 outline outline-2 outline-primary outline-offset-[-2px]' : 'hover:outline hover:outline-1 hover:outline-primary/50 hover:outline-offset-[-1px]'}`}
              >
                {selected === b.id ? (
                  <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-md border bg-background/95 p-1 shadow-sm" onClick={(e) => e.stopPropagation()}>
                    <span className="px-1 text-[10px] font-semibold text-muted-foreground">
                      <Settings2 className="mr-1 inline size-3" />
                      {palette.find((x) => x[0] === b.type)?.[1]}
                    </span>
                    <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, i - 1)}>
                      <ChevronUp className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" disabled={i === blocks.length - 1} onClick={() => move(i, i + 1)}>
                      <ChevronDown className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => duplicate(b)}>
                      <Copy className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(b.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                    <GripVertical className="mx-1 size-4 text-muted-foreground" />
                  </div>
                ) : null}
                <BlockPreview block={b} products={products} categories={categories} pages={pages} store={store} design={activeDesign} locale={locale} />
              </div>
            ))}
          </div>
        </div>
      </section>
      <MediaLibraryDialog open={!!mediaPicker} onOpenChange={(open) => { if (!open) setMediaPicker(null); }} title={mediaPicker?.title || 'Medya Kütüphanesi'} onSelect={(url) => { if (mediaPicker) update(mediaPicker.blockId, 'content', { [mediaPicker.field]: url }); setMediaPicker(null); }} />
    </div>
  );
}

function BlockPreview({ block, products, categories, pages, store, design, locale }: { block: VisualEmailBlock; products: EmailBuilderProduct[]; categories: EmailBuilderCategory[]; pages: EmailBuilderPage[]; store?: EmailBuilderStore; design: EmailTemplateDesign; locale: string }) {
  const c = block.content || {};
  const st = block.settings || {};
  const align = (st.align || 'left') as any;
  const pad = Math.max(0, Math.min(80, Number(st.padding ?? 16)));
  const baseStyle: any = {
    textAlign: align,
    padding: pad,
    background: st.background || design.contentBackground,
    color: st.textColor || design.textColor,
    fontFamily: design.fontFamily,
  };

  if (block.type === 'HEADER') {
    const logo = c.logoUrl || store?.logoUrl || '';
    const showLogo = c.showLogo !== false;
    return (
      <div style={baseStyle}>
        {showLogo && logo ? <img src={logo} alt={store?.name || 'Logo'} className="mx-auto max-h-[58px] max-w-[230px] object-contain" /> : <div className="text-2xl font-bold" style={{ color: design.headingColor }}>{store?.name || 'Mağaza adı'}</div>}
      </div>
    );
  }

  if (block.type === 'HEADING') {
    return (
      <div style={{ ...baseStyle, color: design.headingColor }} className="text-[22px] font-bold leading-8">
        {c.text || 'Başlık'}
      </div>
    );
  }

  if (block.type === 'TEXT') {
    return (
      <div style={baseStyle} className="whitespace-pre-wrap text-[15px] leading-6">
        {String(c.text || 'Metin').replace('{{customer_name}}', 'Ayşe Yılmaz')}
      </div>
    );
  }

  if (block.type === 'IMAGE') {
    const image = c.url ? <img src={c.url} alt={c.alt || ''} className="block h-auto w-full" /> : <div className="rounded-lg border border-dashed bg-muted/30 p-12 text-center text-sm text-muted-foreground">Görsel seçin</div>;
    return <div style={{...baseStyle,padding:0}}>{c.url && c.linkUrl ? <a href={c.linkUrl} className="block w-full">{image}</a> : image}</div>;
  }

  if (block.type === 'COLUMNS') {
    return (
      <div style={baseStyle} className="grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border p-4 text-left" style={{ borderRadius: design.contentRadius, background: design.contentBackground }}>{c.left || 'Sol kolon'}</div>
        <div className="rounded-lg border p-4 text-left" style={{ borderRadius: design.contentRadius, background: design.contentBackground }}>{c.right || 'Sağ kolon'}</div>
      </div>
    );
  }

  if (block.type === 'BUTTON') {
    const radius = Number(st.radius ?? design.buttonRadius) || 0;
    return (
      <div style={baseStyle}>
        <span style={{ background: st.buttonColor || design.primaryColor, borderRadius: radius }} className="inline-flex px-5 py-3 text-sm font-semibold text-white">
          {c.text || 'Buton'}
        </span>
      </div>
    );
  }

  if (block.type === 'DIVIDER') {
    return <div className="bg-white px-4 py-3"><hr className="border-0 border-t border-border" /></div>;
  }

  if (block.type === 'SPACER') {
    return <div className="bg-white" style={{ height: Math.max(8, Math.min(160, Number(st.height) || 24)) }} />;
  }

  if (block.type === 'ORDER_SUMMARY') {
    const sample = products.slice(0, 2);
    const rows = sample.length
      ? sample
      : [
          { id: '1', title: 'Örnek ürün', variants: [{ price: 799 }], images: [] },
          { id: '2', title: 'İkinci ürün', variants: [{ price: 449 }], images: [] },
        ];
    const total = rows.reduce((sum: number, p: any) => sum + Number(productPrice(p) || 0), 0);
    return (
      <div style={baseStyle} className="text-left">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[17px] font-bold" style={{ color: design.headingColor }}>Sipariş özeti</div>
          <div className="text-xs text-muted-foreground">#TEST-1001</div>
        </div>
        <div className="overflow-hidden rounded-lg border" style={{ borderRadius: design.contentRadius }}>
          {rows.map((p: any, idx: number) => (
            <div key={p.id || idx} className="flex items-center gap-3 border-b p-3 last:border-b-0">
              {imageOf(p) ? <img src={imageOf(p)} className="size-12 rounded-md object-cover" alt="" /> : <div className="size-12 rounded-md bg-muted" />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground">1 adet</div>
              </div>
              <div className="text-sm font-semibold">{money(productPrice(p), store?.currency)}</div>
            </div>
          ))}
          <div className="flex justify-between bg-muted/20 p-3 text-sm font-bold">
            <span>Toplam</span>
            <span>{money(total, store?.currency)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (block.type === 'PRODUCT_GRID') {
    const resolved = resolveProducts(block, products);
    const list = resolved.length
      ? resolved
      : Array.from({ length: Math.min(4, Number(c.limit) || 4) }).map((_, i) => ({ id: String(i), title: `Örnek ürün ${i + 1}`, images: [], variants: [{ price: 499 + i * 150 }] } as any));
    const cols = Math.max(1, Math.min(2, Number(c.columns) || 2));
    const buttonRadius = Number(st.radius ?? design.buttonRadius) || 0;
    return (
      <div style={baseStyle} className="text-left">
        {c.title ? <div className="mb-3 text-lg font-bold" style={{ color: design.headingColor }}>{c.title}</div> : null}
        <div className={cols === 1 ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3'}>
          {list.map((p: any) => {
            const categoryLabel = categoryLabelOf(p, categories);
            return (
              <div key={p.id} className="overflow-hidden rounded-lg border" style={{ borderRadius: design.contentRadius, background: design.contentBackground }}>
                {imageOf(p) ? <img src={imageOf(p)} alt={p.title} className="aspect-square w-full object-cover" /> : <div className="aspect-square w-full bg-muted" />}
                <div className="p-3">
                  {c.showCategory !== false && categoryLabel ? <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{categoryLabel}</div> : null}
                  {c.showTitle !== false ? <div className="line-clamp-2 text-sm font-semibold">{p.title}</div> : null}
                  {c.showPrice !== false ? (
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <span>{money(productPrice(p), store?.currency)}</span>
                      {comparePrice(p) ? <span className="text-muted-foreground line-through">{money(comparePrice(p), store?.currency)}</span> : null}
                    </div>
                  ) : null}
                  {c.showButton !== false ? <div className="mt-3 inline-flex px-4 py-2 text-xs font-semibold text-white" style={{ background: design.primaryColor, borderRadius: buttonRadius }}>{c.buttonText || 'Ürünü incele'}</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.type === 'MENU') {
    const items = Array.isArray(c.items) ? c.items : [];
    const styleName = String(c.style || 'SIMPLE');
    const fontSize = Math.max(10, Math.min(28, Number(c.fontSize) || 14));
    const separator = String(c.separator || ' · ');
    const resolveItem = (item:any) => {
      if (item.type === 'CATEGORY') { const row=categories.find((x)=>x.id===item.refId); return {label:item.label || row?.name || row?.title || 'Kategori', url: row?.slug ? `/category/${row.slug}` : '#'}; }
      if (item.type === 'PAGE') { const row=pages.find((x)=>x.id===item.refId); return {label:item.label || row?.title || 'Sayfa', url: row?.slug ? `/pages/${row.slug}` : '#'}; }
      return {label:item.label || 'Bağlantı', url:item.url || '#'};
    };
    const linkStyle:any = styleName==='PILLS' ? {display:'inline-block',padding:'7px 12px',borderRadius:999,background:design.bodyBackground,textDecoration:'none'} : styleName==='BORDERED' ? {display:'inline-block',padding:'7px 12px',border:'1px solid currentColor',borderRadius:6,textDecoration:'none'} : styleName==='UNDERLINE' ? {textDecoration:'underline',textUnderlineOffset:3} : styleName==='FULL_WIDTH' ? {display:'block',width:'100%',padding:'10px 8px',textAlign:'center',textDecoration:'none'} : {textDecoration:'none'};
    if (styleName==='FULL_WIDTH') {
      return <div style={{...baseStyle,fontSize}}>{items.length ? <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.max(1,items.length)}, minmax(0,1fr))`,width:'100%'}}>{items.map((raw:any,index:number)=>{const item=resolveItem(raw);return <a key={raw.id || `${raw.type}-${index}`} href={item.url} style={{...linkStyle,color:st.textColor || design.textColor,fontWeight:600,borderLeft:index>0?'1px solid rgba(0,0,0,.08)':'none'}}>{item.label}</a>})}</div> : <span className="text-muted-foreground">Menü öğesi eklenmedi.</span>}</div>;
    }
    return <div style={{...baseStyle,fontSize}}>{items.length ? items.map((raw:any,index:number)=>{const item=resolveItem(raw);return <span key={raw.id || `${raw.type}-${index}`}><a href={item.url} style={{...linkStyle,color:st.textColor || design.textColor,fontWeight:600}}>{item.label}</a>{styleName!=='PILLS'&&styleName!=='BORDERED'&&index<items.length-1?<span style={{opacity:.45}}>{separator}</span>:index<items.length-1?<span> </span>:null}</span>}) : <span className="text-muted-foreground">Menü öğesi eklenmedi.</span>}</div>;
  }

  if (block.type === 'FOOTER') {
    const previewVars: Record<string, string> = {
      store_name: store?.name || 'Mağaza',
      store_url: '#',
      recipient_email: 'musteri@example.com',
      sender_email: store?.senderEmail || store?.email || 'bildirim@example.com',
      support_phone: store?.phone || '+90 (___) ___ __ __',
      support_email: store?.email || 'destek@example.com',
      privacy_url: store?.privacyUrl || '#',
      company_name: store?.companyName || store?.name || 'Firma unvanı',
      store_address: store?.addressText ? ` · ${store.addressText}` : '',
      mersis_label: store?.mersisNo ? 'MERSİS No: ' : '',
      mersis_no: store?.mersisNo || '',
      year: String(new Date().getFullYear()),
      unsubscribe_url: '#',
    };
    let html = String(c.legalHtml || defaultLegalFooterHtml(locale));
    html = html.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_m: string, key: string) => previewVars[String(key).toLowerCase()] ?? '');
    const alignClass = (value: string) => value === 'left' ? 'text-left' : value === 'right' ? 'text-right' : 'text-center';
    const logo = c.logoUrl || store?.logoUrl || '';
    const socials = Object.entries(c.socialLinks || {}).filter(([, url]) => String(url || '').trim());
    const phone = c.contactPhone || store?.phone || '';
    const email = c.contactEmail || store?.email || '';
    const website = c.contactWebsite || '#';
    return <div style={baseStyle} className="grid gap-3 text-xs leading-5 text-muted-foreground">
      {c.showLogo === true ? <div className={alignClass(c.logoPosition || 'center')}>{logo ? <img src={logo} alt={store?.name || 'Logo'} className="inline-block max-h-14 max-w-[220px] object-contain" /> : <strong>{store?.name || 'Mağaza adı'}</strong>}</div> : null}
      {c.showSocials === true && socials.length ? <div className={alignClass(c.socialPosition || 'center')}>{socials.map(([name]) => <span key={name} className="mx-1 inline-block underline">{name === 'x' ? 'X' : name.charAt(0).toUpperCase()+name.slice(1)}</span>)}</div> : null}
      {c.showContact !== false && (phone || email || website) ? <div className={alignClass(c.contactPosition || 'center')}>{phone ? <span className="mx-1">{phone}</span> : null}{email ? <span className="mx-1 underline">{email}</span> : null}{website ? <span className="mx-1 underline">Web</span> : null}</div> : null}
      <iframe title="Yasal footer önizleme" className="pointer-events-none h-[260px] w-full border-0 bg-transparent" srcDoc={`<style>body{margin:0;font-family:${design.fontFamily};color:#6b7280;font-size:12px;line-height:1.6}p{margin:0 0 10px}a{color:#6b7280;text-decoration:underline}</style>${html}`} />
    </div>;
  }
  return null;
}
