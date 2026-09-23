'use client';

import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Icon} from '@iconify/react';

export type DesignPage='overview'|'general'|'header'|'footer'|'products'|'homepage'|'menu';
type Props={page:DesignPage;data:any;sid:string;req:(path:string,options?:any)=>Promise<any>;reload:()=>Promise<void>};
type Viewport='desktop'|'tablet'|'mobile';
type PageKey='home'|'product'|'category'|'blog'|'info';
type PanelMode='root'|'sections'|'library'|'settings'|'themes'|'history';
type ModuleDef={type:string;label:string;icon:string;col:number;description:string};
type ModuleGroup={title:string;icon:string;items:ModuleDef[]};


function clone<T>(value:T):T{
  try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value??null)) as T}
}
function arr<T=any>(value:any):T[]{return Array.isArray(value)?value:Array.isArray(value?.items)?value.items:[]}
function num(value:any,fallback:number){const n=Number(value);return Number.isFinite(n)?n:fallback}
function esc(value:any){return String(value??'').replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#039;"}[m]||m))}
function cleanHtml(value:any){return String(value||'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/javascript\s*:/gi,'')}
function sectionTitle(section:any){return String(section?.settings?.title||blockTitle(section?.sectionType)||'Bölüm')}
function defaultSectionSettings(type:string,col=12){
  const base:any={title:'',subtitle:'',content:'',colDesktop:col,colTablet:12,colMobile:12,textAlign:'left',count:8};
  if(type==='blog'||type==='blog_posts')return {...base,count:3};
  if(type==='reviews'||type==='testimonials'||type==='testimonials_large')return {...base,count:4};
  if(type==='custom_html')return {...base,html:''};
  if(type==='shoppable_feed')return {...base,handle:''};
  if(type==='spacer')return {...base,height:60};
  if(type==='divider')return {...base,thickness:1};
  return base;
}

const FONT_OPTIONS=[
  ['Inter, ui-sans-serif, system-ui, sans-serif','Inter'],
  ['Roboto, Arial, sans-serif','Roboto'],
  ['"Open Sans", Arial, sans-serif','Open Sans'],
  ['Montserrat, Arial, sans-serif','Montserrat'],
  ['Poppins, Arial, sans-serif','Poppins'],
  ['Lato, Arial, sans-serif','Lato'],
  ['Oswald, Arial, sans-serif','Oswald'],
  ['Raleway, Arial, sans-serif','Raleway'],
  ['Nunito, Arial, sans-serif','Nunito'],
  ['"Nunito Sans", Arial, sans-serif','Nunito Sans'],
  ['"Source Sans 3", Arial, sans-serif','Source Sans 3'],
  ['"DM Sans", Arial, sans-serif','DM Sans'],
  ['Manrope, Arial, sans-serif','Manrope'],
  ['"Work Sans", Arial, sans-serif','Work Sans'],
  ['"Be Vietnam Pro", Arial, sans-serif','Be Vietnam Pro'],
  ['Rubik, Arial, sans-serif','Rubik'],
  ['Karla, Arial, sans-serif','Karla'],
  ['Mulish, Arial, sans-serif','Mulish'],
  ['Ubuntu, Arial, sans-serif','Ubuntu'],
  ['"Fira Sans", Arial, sans-serif','Fira Sans'],
  ['"Libre Franklin", Arial, sans-serif','Libre Franklin'],
  ['"IBM Plex Sans", Arial, sans-serif','IBM Plex Sans'],
  ['"PT Sans", Arial, sans-serif','PT Sans'],
  ['Merriweather, Georgia, serif','Merriweather'],
  ['"Playfair Display", Georgia, serif','Playfair Display'],
  ['Lora, Georgia, serif','Lora'],
  ['"Libre Baskerville", Georgia, serif','Libre Baskerville'],
  ['"Cormorant Garamond", Georgia, serif','Cormorant Garamond'],
  ['"Roboto Slab", Georgia, serif','Roboto Slab'],
  ['"Bebas Neue", Impact, sans-serif','Bebas Neue'],
  ['"Barlow Condensed", Arial, sans-serif','Barlow Condensed'],
  ['"Archivo Narrow", Arial, sans-serif','Archivo Narrow'],
  ['Arial, Helvetica, sans-serif','Arial'],
  ['Georgia, "Times New Roman", serif','Georgia'],
  ['"Trebuchet MS", Arial, sans-serif','Trebuchet'],
  ['Verdana, Geneva, sans-serif','Verdana'],
  ['"Courier New", monospace','Courier'],
];

const PAGE_OPTIONS:[PageKey,string][]=[
  ['home','Anasayfa'],
  ['product','Ürün Sayfası'],
  ['category','Kategori Sayfası'],
  ['blog','Blog'],
  ['info','Bilgilendirme Sayfaları'],
];

const MODULE_GROUPS:ModuleGroup[]=[
  {title:'Hero & Banner',icon:'iconoir:media-image',items:[
    {type:'slider',label:'Slider',icon:'iconoir:carousel',col:12,description:'Çoklu görsel/video slider.'},{type:'video_hero',label:'Video Hero',icon:'iconoir:video-camera',col:12,description:'Tam genişlik video açılışı.'},{type:'hero',label:'Hero',icon:'iconoir:frame-alt',col:12,description:'Büyük açılış alanı.'},{type:'banner',label:'Banner',icon:'iconoir:media-image',col:12,description:'Kampanya bannerı.'},{type:'banner_collage',label:'Banner Kolaj',icon:'iconoir:grid-add',col:12,description:'Birden fazla görselden kolaj.'},{type:'banner_text_outside',label:'Dış Metinli Banner',icon:'iconoir:layout-left',col:12,description:'Görsel ve dış metin alanı.'},{type:'discount_banner',label:'İndirim Bannerı',icon:'iconoir:percentage-circle',col:12,description:'İndirim ve kampanya vurgusu.'},{type:'countdown',label:'Geri Sayım',icon:'iconoir:timer',col:12,description:'Kampanya sayacı.'},
  ]},
  {title:'Ürün & Kategori',icon:'iconoir:shop',items:[
    {type:'featured_collection',label:'Öne Çıkan Koleksiyon',icon:'iconoir:shop',col:12,description:'Seçili koleksiyondan ürünler.'},{type:'featured_collection_tabs',label:'Koleksiyon Sekmeleri',icon:'iconoir:view-columns-3',col:12,description:'Sekmeli ürün koleksiyonları.'},{type:'featured_collection_row',label:'Koleksiyon Satırı',icon:'iconoir:carousel',col:12,description:'Yatay ürün satırı.'},{type:'product_grid',label:'Ürün Grid',icon:'iconoir:grid-xmark',col:12,description:'Ürün grid görünümü.'},{type:'product_list',label:'Ürün Listesi',icon:'iconoir:list',col:12,description:'Liste görünümü.'},{type:'product_banner_list',label:'Bannerlı Ürün Listesi',icon:'iconoir:layout-left',col:12,description:'Banner ve ürün listesi.'},{type:'featured_product',label:'Öne Çıkan Ürün',icon:'iconoir:box-iso',col:6,description:'Tek ürünü vurgular.'},{type:'recommendations',label:'Ürün Önerileri',icon:'iconoir:sparks',col:12,description:'Kişisel/bağlamsal öneriler.'},{type:'recently_viewed',label:'Son Görüntülenenler',icon:'iconoir:history',col:12,description:'Son görüntülenen ürünler.'},{type:'collection_list',label:'Kategori Listesi',icon:'iconoir:grid-xmark',col:12,description:'Kategori kartları.'},{type:'category_slider',label:'Kategori Slider',icon:'iconoir:carousel',col:12,description:'Kaydırılabilir kategori kartları.'},{type:'collection_spotlight',label:'Kategori Spotlight',icon:'iconoir:spotlight',col:12,description:'Öne çıkan kategori.'},{type:'collection_text',label:'Metinli Kategoriler',icon:'iconoir:text',col:12,description:'Metin ağırlıklı kategori listesi.'},{type:'collection_image_text',label:'Görselli Kategoriler',icon:'iconoir:media-image',col:12,description:'Görselli kategori blokları.'},{type:'popular_categories',label:'Popüler Kategoriler',icon:'iconoir:star',col:12,description:'Popüler kategoriler.'},{type:'product_vertical_tabs',label:'Dikey Ürün Sekmeleri',icon:'iconoir:view-columns-2',col:12,description:'Dikey sekmeli ürün listesi.'}
  ]},
  {title:'İçerik & Medya',icon:'iconoir:book',items:[
    {type:'media_text',label:'Medya + Metin',icon:'iconoir:media-image',col:12,description:'Görsel/video ve metin.'},{type:'media_text_vertical',label:'Dikey Medya + Metin',icon:'iconoir:layout-top',col:12,description:'Dikey yerleşim.'},{type:'media_collage',label:'Medya Kolaj',icon:'iconoir:grid-add',col:12,description:'Kolaj içerik alanı.'},{type:'gallery',label:'Galeri',icon:'iconoir:media-image-list',col:12,description:'Görsel galerisi.'},{type:'masonry_gallery',label:'Masonry Galeri',icon:'iconoir:grid-xmark',col:12,description:'Değişken boyutlu görsel galerisi.'},{type:'image_comparison',label:'Görsel Karşılaştırma',icon:'iconoir:compare',col:12,description:'Önce/sonra karşılaştırması.'},{type:'lookbook',label:'Lookbook',icon:'iconoir:shopping-bag',col:12,description:'Hotspotlu ürün görseli.'},{type:'shop_the_look',label:'Görünümü Satın Al',icon:'iconoir:shop',col:12,description:'Ürün noktalı stil görseli.'},{type:'shoppable_feed',label:'Alışveriş Akışı',icon:'iconoir:instagram',col:12,description:'Görsel akış ve ürün etiketleri.'},{type:'hover_image_list',label:'Hover Görselli Liste',icon:'iconoir:list-select',col:12,description:'Satır üzerine gelince görsel değişir.'},{type:'rich_text',label:'Zengin Metin',icon:'iconoir:text',col:12,description:'Başlık ve metin içeriği.'},{type:'video',label:'Video',icon:'iconoir:video-camera',col:12,description:'Video alanı.'},{type:'accordion',label:'Akordeon / SSS',icon:'iconoir:nav-arrow-down',col:12,description:'Açılır içerik satırları.'},{type:'counter',label:'Sayaçlar',icon:'iconoir:stats-up-square',col:12,description:'İstatistik ve sayaçlar.'},{type:'icon_columns',label:'İkonlu Kolonlar',icon:'iconoir:apps',col:12,description:'Özellik ve fayda kolonları.'},{type:'icon_features',label:'İkonlu Özellikler',icon:'iconoir:star',col:12,description:'Güven ve hizmet özellikleri.'},{type:'contact_form',label:'İletişim Formu',icon:'iconoir:mail',col:12,description:'İletişim formu.'},{type:'map',label:'Harita',icon:'iconoir:map',col:12,description:'Mağaza/konum haritası.'}
  ]},
  {title:'Pazarlama & Sosyal Kanıt',icon:'iconoir:megaphone',items:[
    {type:'newsletter',label:'Bülten',icon:'iconoir:mail',col:12,description:'E-posta üyeliği.'},{type:'announcement',label:'Duyuru',icon:'iconoir:megaphone',col:12,description:'Kampanya duyurusu.'},{type:'ticker_text',label:'Metin Ticker',icon:'iconoir:fast-arrow-right',col:12,description:'Kayan metin şeridi.'},{type:'ticker_collection',label:'Kategori Ticker',icon:'iconoir:carousel',col:12,description:'Kayan kategori şeridi.'},{type:'promotion_popup',label:'Promosyon Popup',icon:'iconoir:window-tabs',col:12,description:'Kampanya popup alanı.'},{type:'promo_cards',label:'Promosyon Kartları',icon:'iconoir:megaphone',col:12,description:'Kampanya fayda kartları.'},{type:'trust_badges',label:'Güven Rozetleri',icon:'iconoir:shield-check',col:12,description:'Ödeme, iade ve teslimat güveni.'},{type:'testimonials',label:'Müşteri Yorumları',icon:'iconoir:star',col:12,description:'Yorum kartları.'},{type:'testimonials_large',label:'Büyük Yorumlar',icon:'iconoir:quote-message',col:12,description:'Büyük müşteri yorumu alanı.'},{type:'brands_grid',label:'Marka Grid',icon:'iconoir:grid-xmark',col:12,description:'Marka logoları.'},{type:'brands_list',label:'Marka Listesi',icon:'iconoir:list',col:12,description:'Marka listesi.'},{type:'blog_posts',label:'Blog Yazıları',icon:'iconoir:book',col:12,description:'Blog kartları.'},{type:'instagram',label:'Instagram Akışı',icon:'iconoir:instagram',col:12,description:'Sosyal profil ve akış alanı.'},{type:'twitter',label:'Sosyal Akış',icon:'iconoir:x',col:12,description:'Sosyal kanal bağlantısı.'},{type:'free_shipping_bar',label:'Ücretsiz Kargo Çubuğu',icon:'iconoir:delivery-truck',col:12,description:'Ücretsiz kargo ilerleme alanı.'}
  ]},
  {title:'Yerleşim & Yardımcılar',icon:'iconoir:grid-add',items:[
    {type:'collage',label:'Kolaj',icon:'iconoir:grid-add',col:12,description:'Serbest kolaj düzeni.'},{type:'app_area',label:'Uygulama Alanı',icon:'iconoir:puzzle',col:12,description:'Uygulama bileşenleri için alan.'},{type:'mega_menu_module',label:'Mega Menü Modülü',icon:'iconoir:menu-scale',col:12,description:'Mega menü içeriği.'},{type:'header_blurb',label:'Header Bilgi Alanı',icon:'iconoir:info-circle',col:12,description:'Header yardımcı bilgisi.'},{type:'footer_logo',label:'Footer Logo Alanı',icon:'iconoir:media-image',col:12,description:'Footer marka alanı.'},{type:'footer_mobile_nav',label:'Mobil Alt Menü',icon:'iconoir:mobile-dev-mode',col:12,description:'Mobil sabit alt navigasyon.'},{type:'back_to_top',label:'Yukarı Dön',icon:'iconoir:arrow-up',col:12,description:'Sayfa başına dönüş kontrolü.'},{type:'tags',label:'Etiketler',icon:'iconoir:label',col:12,description:'Etiket listesi.'},{type:'spacer',label:'Boşluk',icon:'iconoir:expand',col:12,description:'Bölümler arası boşluk.'},{type:'divider',label:'Ayraç',icon:'iconoir:minus',col:12,description:'İçerik ayracı.'},{type:'custom_html',label:'Özel HTML',icon:'iconoir:code',col:12,description:'Güvenli özel HTML içeriği.'}
  ]}
];
export default function DesignViewRouter({page,data,sid,req,reload}:Props){
  const params=useSearchParams();
  const initialTab=String(params.get('tab')||'');
  const initialPage:PageKey=initialTab==='products'?'product':'home';
  const initialSelection=initialTab==='header'?'header':initialTab==='footer'?'footer':initialTab==='general'?'theme':initialTab==='products'?'product':'';
  const initialPanel:PanelMode=initialSelection?'settings':'root';
  const[design,setDesign]=useState<any>(()=>clone(data.design||{}));
  const[sections,setSections]=useState<any[]>(()=>clone(arr(data.sections)));
  const[pageKey,setPageKey]=useState<PageKey>(initialPage);
  const[selected,setSelected]=useState<string>(initialSelection);
  const[panelMode,setPanelMode]=useState<PanelMode>(initialPanel);
  const[themes,setThemes]=useState<any[]>([]);const[themeErr,setThemeErr]=useState('');
  const[previewThemeId,setPreviewThemeId]=useState<string>('');
  const[history,setHistory]=useState<any[]>([]);const[historyErr,setHistoryErr]=useState('');const[loadThemeModules,setLoadThemeModules]=useState(false);
  const[viewport,setViewport]=useState<Viewport>('desktop');
  const[moduleQuery,setModuleQuery]=useState('');
  const[dragId,setDragId]=useState<string>('');
  const[saving,setSaving]=useState(false);
  const[dirty,setDirty]=useState(false);
  const[msg,setMsg]=useState('');
  const[err,setErr]=useState('');
  const[sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const[previewUrl,setPreviewUrl]=useState('');
  const previewRef=useRef<HTMLIFrameElement|null>(null);

  function sendDraft(message:any){const frame=previewRef.current?.contentWindow;if(!frame)return;frame.postMessage({source:'commerce-design-editor',action:'draft',...message},'*')}
  function previewTheme(theme:any,skin?:any){
    const key=String(theme.id)+':'+String(skin?.slug||'');
    setPreviewThemeId(key);
    sendDraft({kind:'theme',theme});
    const base=theme.config?.design||{};const skinDesign=skin?.design||{};
    const previewDesign={general:{...(base.general||{}),...(skinDesign.general||{}),...(skin?{skinSlug:skin.slug,skinName:skin.name,skinGroup:skin.group}:{})},header:{...(base.header||{}),...(skinDesign.header||{})},footer:{...(base.footer||{}),...(skinDesign.footer||{})},products:{...(base.products||{}),...(skinDesign.products||{})}};
    sendDraft({kind:'design',design:previewDesign});
    const preset=Array.isArray(skin?.homePreset)?skin.homePreset:theme.config?.homePreset;
    if(loadThemeModules&&Array.isArray(preset))sendDraft({kind:'sections',sections:preset.map((x:any,i:number)=>({id:'theme-preview-'+i,pageKey:'home',sectionType:x.sectionType,sortOrder:i,enabled:x.enabled!==false,settings:x.settings||{}}))});
  }
  function closeThemePreview(){
    const active=themes.find((t:any)=>t.current);
    setPreviewThemeId('');
    if(active)sendDraft({kind:'theme',theme:active});
    sendDraft({kind:'design',design});
    sendDraft({kind:'sections',sections});
  }

  useEffect(()=>{setDesign(clone(data.design||{}));setSections(clone(arr(data.sections)));setDirty(false)},[data.design,data.sections]);

  useEffect(()=>{
    const host=window.location.hostname.toLowerCase();
    const blocked=host.endsWith('.hosted.app')||['ticarti.com','www.ticarti.com','login.ticarti.com','app.ticarti.com','academy.ticarti.com','superadmin.ticarti.com','dev.ticarti.com'].includes(host);
    const origin=blocked?'https://ticarti.com':window.location.origin;
    const path=pageKey==='home'?'/' : pageKey==='blog'?'/blog' : pageKey==='info'?'/pages/gizlilik-politikasi' : '/products';
    const url=new URL(path,origin);
    url.searchParams.set('ticarti_design','1');
    setPreviewUrl(url.toString());
  },[pageKey]);

  useEffect(()=>{
    const frame=previewRef.current?.contentWindow;
    if(!frame)return;
    frame.postMessage({source:'commerce-design-editor',action:'select',target:selected},'*');
  },[selected,previewUrl]);

  useEffect(()=>{
    const onPreviewMessage=(event:MessageEvent)=>{
      const payload=event.data;
      if(!payload||payload.source!=='commerce-design-preview')return;
      const target=String(payload.target||'');
      if(!target)return;
      if(target.startsWith('section:')&&pageKey!=='home')return;
      setSelected(target);
      setPanelMode('settings');
    };
    window.addEventListener('message',onPreviewMessage);
    return()=>window.removeEventListener('message',onPreviewMessage);
  },[pageKey]);

  const selectedSection=useMemo(()=>selected.startsWith('section:')?sections.find(x=>String(x.id)===selected.slice(8)):null,[selected,sections]);
  const themeName=String(design?.general?.themeName||'Mağaza Teması');
  const currentTheme=themes.find((t:any)=>t.current)||themes[0];const allowedModules:Set<string>=new Set<string>(((currentTheme?.config?.modules||[]) as any[]).filter((m:any)=>m.enabled!==false).map((m:any)=>String(m.type)));

  function updateDesign(group:string,key:string,value:any){setDesign((current:any)=>{const next={...current,[group]:{...(current?.[group]||{}),[key]:value}};sendDraft({kind:'design',design:next});return next});setDirty(true);setMsg('')}
  function updateSection(id:string,patch:any){setSections(current=>{const next=current.map(row=>String(row.id)===id?{...row,...patch,settings:patch.settings?{...(row.settings||{}),...patch.settings}:row.settings}:row);const section=next.find(row=>String(row.id)===id);if(section)sendDraft({kind:'section',section});return next});setDirty(true);setMsg('')}

  useEffect(()=>{if(!sid)return;req('/admin/themes?storeId='+encodeURIComponent(sid)).then(setThemes).catch((e:any)=>setThemeErr(e?.message||'Temalar yüklenemedi.'));req('/admin/design/history?storeId='+encodeURIComponent(sid)).then(setHistory).catch((e:any)=>setHistoryErr(e?.message||'Geçmiş yüklenemedi.'))},[sid]);
  function openSettings(target:string){setSelected(target);setPanelMode('settings')}
  function openSections(){setSelected('');setPanelMode('sections')}
  function panelBack(){
    if(panelMode==='library'){setPanelMode('sections');return;}
    if(panelMode==='themes'||panelMode==='history'){setPanelMode('root');return;}
    if(panelMode==='settings'&&selected.startsWith('section:')){setPanelMode('sections');return;}
    setPanelMode('root');
  }

  async function saveAll(){
    setSaving(true);setErr('');setMsg('');
    try{
      await req('/admin/design/history',{method:'POST',body:JSON.stringify({storeId:sid,reason:'MANUAL_SAVE',label:'Kaydetmeden önce'})});
      const saved=await req('/admin/design/settings',{method:'PATCH',body:JSON.stringify({storeId:sid,design})});
      setDesign(saved);
      for(let i=0;i<sections.length;i++){
        const row=sections[i];
        await req('/admin/design/sections/'+encodeURIComponent(row.id),{method:'PATCH',body:JSON.stringify({storeId:sid,enabled:row.enabled!==false,sortOrder:i,settings:row.settings||{}})});
      }
      if(sections.length)await req('/admin/design/sections/order',{method:'PATCH',body:JSON.stringify({storeId:sid,pageKey:'home',items:sections.map((x:any,i:number)=>({id:x.id,sortOrder:i}))})});
      setSections(current=>current.map((x:any,i:number)=>({...x,sortOrder:i})));
      setDirty(false);setMsg('Tasarım kaydedildi.');setHistory(await req('/admin/design/history?storeId='+encodeURIComponent(sid)));
    }catch(e:any){setErr(e?.message||'Tasarım kaydedilemedi.')}finally{setSaving(false)}
  }

  async function addModule(def:ModuleDef){
    setErr('');
    try{
      const row=await req('/admin/design/sections',{method:'POST',body:JSON.stringify({storeId:sid,pageKey:'home',sectionType:def.type,sortOrder:sections.length,enabled:true,settings:defaultSectionSettings(def.type,def.col)})});
      setSections(current=>[...current,row]);setSelected('section:'+row.id);setPanelMode('settings');setDirty(true);setPageKey('home');
    }catch(e:any){setErr(e?.message||'Bölüm eklenemedi.')}
  }

  async function duplicateSection(section:any){
    try{
      const row=await req('/admin/design/sections',{method:'POST',body:JSON.stringify({storeId:sid,pageKey:'home',sectionType:section.sectionType,sortOrder:sections.length,enabled:section.enabled!==false,settings:clone(section.settings||{})})});
      setSections(current=>[...current,row]);setSelected('section:'+row.id);setPanelMode('settings');setDirty(true);
    }catch(e:any){setErr(e?.message||'Bölüm kopyalanamadı.')}
  }

  async function deleteSection(id:string){
    if(!window.confirm('Bu bölümü silmek istiyor musunuz?'))return;
    try{await req('/admin/design/sections/'+encodeURIComponent(id)+'?storeId='+encodeURIComponent(sid),{method:'DELETE'});setSections(current=>current.filter(x=>String(x.id)!==id));setSelected('');setPanelMode('sections');setDirty(true)}catch(e:any){setErr(e?.message||'Bölüm silinemedi.')}
  }

  function dropOn(targetId:string){
    if(!dragId||dragId===targetId)return setDragId('');
    setSections(current=>{const next=[...current];const from=next.findIndex(x=>String(x.id)===dragId);const to=next.findIndex(x=>String(x.id)===targetId);if(from<0||to<0)return current;const[item]=next.splice(from,1);next.splice(to,0,item);return next});setDragId('');setDirty(true);
  }

  function selectPage(next:PageKey){setPageKey(next);setSelected('');setPanelMode('root')}

  const rootPanel=<>
    <div className="design-v15-sidebar-head"><div><b>{PAGE_OPTIONS.find(x=>x[0]===pageKey)?.[1]}</b><small>Canlı mağaza görünümünü buradan düzenleyin</small></div></div>
    <div className="design-v15-root-scroll">
      <TreeLabel text="Sayfa"/>
      {pageKey==='home'?<TreeItem icon="iconoir:component" label="Anasayfa Bölümleri" subtitle={`${sections.length} bölüm · sürükle, sırala, düzenle`} active={false} onClick={openSections}/>:pageKey==='product'?<><TreeItem icon="iconoir:box-iso" label="Ürün Sayfası" subtitle={`Şablon ${num(design?.products?.productPageTemplate,1)} · özellikleri seç`} active={false} onClick={()=>openSettings('product')}/><TreeItem icon="iconoir:view-grid" label="Ürün Kartı" subtitle={`Kart ${num(design?.products?.productCardTemplate,1)} · görünümü seç`} active={false} onClick={()=>openSettings('product-card')}/></>:pageKey==='category'?<TreeItem icon="iconoir:grid-xmark" label="Kategori Sayfası" subtitle={`Şablon ${num(design?.products?.categoryTemplate,1)} · filtre ve grid ayarları`} active={false} onClick={()=>openSettings('category')}/>:pageKey==='blog'?<TreeItem icon="iconoir:book" label="Blog Görünümü" subtitle="İçerik gerçek blog verilerinden gelir" active={false} onClick={()=>openSettings('blog')}/>:<TreeItem icon="iconoir:page" label="Bilgilendirme Sayfası" subtitle="İçerik Sayfalar modülünden gelir" active={false} onClick={()=>openSettings('info')}/>} 
      <TreeLabel text="Global"/>
      <TreeItem icon="iconoir:panel-top" label="Header" subtitle={`Header ${num(design?.header?.template,1)} · logo, menü, duyuru`} active={false} onClick={()=>openSettings('header')}/>
      <TreeItem icon="iconoir:panel-bottom" label="Footer" subtitle={`Footer ${num(design?.footer?.template,1)} · kolonlar ve alt alan`} active={false} onClick={()=>openSettings('footer')}/>
      <TreeItem icon="iconoir:shop" label="Tema Kataloğu" subtitle="Tema seç, önizle veya satın al" active={false} onClick={()=>{setSelected('');setPanelMode('themes')}}/>
      <TreeItem icon="iconoir:history" label="Tasarım Geçmişi" subtitle="Önceki sürümlere güvenle dön" active={false} onClick={()=>{setSelected('');setPanelMode('history')}}/>
      <TreeItem icon="iconoir:palette" label="Tema Ayarları" subtitle="Renk, tipografi, genişlik ve bileşen dili" active={false} onClick={()=>openSettings('theme')}/>
      <div className="design-v15-live-note"><Icon icon="iconoir:eye"/><div><b>Canlı sistem</b><span>Önizlemede yalnızca mağazanızdaki gerçek ürün, kategori, blog ve içerikler kullanılır.</span></div></div>
    </div>
  </>;

  const sectionsPanel=<>
    <SidebarSubHeader title="Anasayfa Bölümleri" subtitle={`${sections.length} bölüm`} onBack={panelBack} action={<button type="button" onClick={()=>setPanelMode('library')}><Icon icon="iconoir:plus"/> Ekle</button>}/>
    <div className="design-v14-tree-scroll design-v15-section-scroll">
      {sections.length?<div className="design-v14-section-list">{sections.map((section:any,index:number)=><SectionTreeItem key={section.id} section={section} index={index} active={selected==='section:'+section.id} onSelect={()=>openSettings('section:'+section.id)} onToggle={()=>updateSection(String(section.id),{enabled:section.enabled===false})} onDuplicate={()=>void duplicateSection(section)} onDelete={()=>void deleteSection(String(section.id))} onDragStart={()=>setDragId(String(section.id))} onDrop={()=>dropOn(String(section.id))}/>)}</div>:<div className="design-v15-empty"><Icon icon="iconoir:component"/><b>Henüz bölüm yok</b><span>Gerçek mağaza içeriğini kullanacak ilk bölümü ekleyin.</span></div>}
      <button type="button" className="design-v14-add-row" onClick={()=>setPanelMode('library')}><Icon icon="iconoir:plus"/> Bölüm Ekle</button>
    </div>
  </>;

  const themesPanel=<>
    <div className="design-theme-compact-tools">
      <button type="button" className="design-theme-back" onClick={panelBack}><Icon icon="iconoir:nav-arrow-left"/> Geri</button>
      <label className="design-theme-inline-option"><input type="checkbox" checked={loadThemeModules} onChange={e=>setLoadThemeModules(e.target.checked)}/><span>Skin düzenini de uygula</span></label>
    </div>
    <div className="design-v14-tree-scroll design-theme-scroll">
      {themeErr&&<div className="design-v15-inline-error">{themeErr}</div>}
      <div className="design-theme-list">{themes.flatMap((t:any)=>{const skins=Array.isArray(t.config?.skins)&&t.config.skins.length?t.config.skins:[null];return skins.map((skin:any)=>{const key=String(t.id)+':'+String(skin?.slug||'');const previewing=previewThemeId===key;const current=t.current&&(!skin||String(t.activeSkin||'')===String(skin.slug));const skinDesign=skin?.design||{};const accent=skinDesign.general?.primaryColor||skinDesign.general?.accentColor||t.config?.style?.accent||'#304ffe';const title=skin?.name||t.name;const category=String(skin?.category||t.category||'Genel');const group=skin?skin.group==='main-demos'?'Ana Demo':skin.group==='classic-skins'?'Klasik Skin':'Yeni Skin':String(t.category||'Tema');const available=t.owned||t.included||Number(t.price)===0;return <div key={key} className={'design-theme-card '+(current?'active ':'')+(previewing?'previewing':'')}>
        <div className="design-theme-preview" style={{background:`linear-gradient(135deg,${accent} 0%,${accent}88 52%,#f6f8f7 52%,#ffffff 100%)`}} aria-hidden="true">{current?<Icon icon="iconoir:check-circle"/>:previewing?<Icon icon="iconoir:eye"/>:<Icon icon="iconoir:palette"/>}</div>
        <div className="design-theme-copy"><b>{title}</b><small>{category} · {group}</small><span>{current?'Aktif':available?'Paketinize dahil':Number(t.price)>0?`${Number(t.price).toLocaleString('tr-TR')} ${t.currency}`:'Kullanılabilir'}</span></div>
        <div className="design-theme-actions"><button type="button" className="design-v15-light-btn" onClick={()=>previewing?closeThemePreview():previewTheme(t,skin)}>{previewing?'Kapat':'Önizle'}</button>{!current&&available?<button type="button" className="design-v15-primary-btn" onClick={async()=>{try{const out=await req('/admin/themes/'+t.id+'/activate',{method:'POST',body:JSON.stringify({storeId:sid,loadThemeModules,skinSlug:skin?.slug||undefined})});if(out?.design)setDesign(out.design);if(Array.isArray(out?.sections))setSections(out.sections);setPreviewThemeId('');setDirty(false);setThemes(await req('/admin/themes?storeId='+encodeURIComponent(sid)));setHistory(await req('/admin/design/history?storeId='+encodeURIComponent(sid)));await reload()}catch(e:any){setThemeErr(e.message)}}}>Kullan</button>:!current?<button type="button" className="design-v15-primary-btn" onClick={async()=>{try{const out=await req('/admin/billing/iyzico/theme-checkout',{method:'POST',body:JSON.stringify({themeId:t.id})});if(out?.included||out?.owned){setThemes(await req('/admin/themes?storeId='+encodeURIComponent(sid)));return}if(out?.paymentUrl)window.location.href=out.paymentUrl}catch(e:any){setThemeErr(e.message)}}}>Satın al</button>:null}</div>
      </div>})})}</div>
    </div>
  </>;

  const historyPanel=<>
    <SidebarSubHeader title="Tasarım Geçmişi" subtitle="Son 30 güvenli geri dönüş noktası" onBack={panelBack}/>
    <div className="design-v14-tree-scroll">{historyErr&&<div className="design-v15-inline-error">{historyErr}</div>}{history.length?<div className="design-history-list">{history.map((h:any)=><div className="design-history-card" key={h.id}><div><b>{h.label||'Tasarım sürümü'}</b><small>{new Date(h.createdAt).toLocaleString('tr-TR')} · {h.themeSlug}</small></div><button type="button" onClick={async()=>{if(!window.confirm('Bu tasarım sürümüne dönmek istiyor musunuz? Mevcut haliniz ayrıca otomatik yedeklenecek.'))return;try{await req('/admin/design/history/'+encodeURIComponent(h.id)+'/restore',{method:'POST',body:JSON.stringify({storeId:sid})});setHistory(await req('/admin/design/history?storeId='+encodeURIComponent(sid)));await reload();setMsg('Önceki tasarım geri yüklendi.');setPanelMode('root')}catch(e:any){setHistoryErr(e.message)}}}>Geri Yükle</button></div>)}</div>:<div className="design-v15-empty"><Icon icon="iconoir:history"/><b>Henüz geçmiş yok</b><span>Tema değiştirildiğinde veya tasarım kaydedildiğinde otomatik yedek oluşur.</span></div>}</div>
  </>;

  const settingsPanel=<>
    <SidebarSubHeader title={selectedSection?sectionTitle(selectedSection):selected==='theme'?'Tema Ayarları':selected==='header'?'Header':selected==='footer'?'Footer':selected==='product'?'Ürün Sayfası':selected==='product-card'?'Ürün Kartı':selected==='category'?'Kategori Sayfası':selected==='blog'?'Blog Görünümü':selected==='info'?'Bilgilendirme Sayfası':selected==='topbar'?'Duyuru Barı':'Ayarlar'} subtitle={selectedSection?blockTitle(selectedSection.sectionType):'Canlı önizlemeye anında uygulanır'} onBack={panelBack}/>
    <div className="design-v15-settings-scroll"><SettingsPanel selected={selected} section={selectedSection} design={design} updateDesign={updateDesign} updateSection={(patch:any)=>selectedSection&&updateSection(String(selectedSection.id),{settings:{...(selectedSection.settings||{}),...patch}})} onDelete={()=>selectedSection&&void deleteSection(String(selectedSection.id))}/></div>
  </>;

  return <div className="design-editor-v14 design-editor-v15">
    <div className="design-v14-topbar">
      <div className="design-v14-topbar-left">
        <Link href="/dashboard" className="design-v14-back" aria-label="Panele dön"><Icon icon="iconoir:arrow-left"/></Link>
        <button type="button" className="design-v15-sidebar-toggle" onClick={()=>setSidebarCollapsed(v=>!v)} title={sidebarCollapsed?'Paneli aç':'Paneli daralt'}><Icon icon={sidebarCollapsed?'iconoir:sidebar-expand':'iconoir:sidebar-collapse'}/></button>
        <div className="design-v14-title"><b>Mağaza Tasarımı</b><small>{themeName} · gerçek verilerle canlı önizleme</small></div>
      </div>
      <div className="design-v14-topbar-center">
        <label className="design-v14-page-select"><select value={pageKey} onChange={e=>selectPage(e.target.value as PageKey)}>{PAGE_OPTIONS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><Icon icon="iconoir:nav-arrow-down"/></label>
        <div className="design-v14-viewport-switch">{([['desktop','iconoir:monitor'],['tablet','iconoir:tablet'],['mobile','iconoir:smartphone-device']] as [Viewport,string][]).map(([id,icon])=><button type="button" key={id} className={viewport===id?'active':''} onClick={()=>setViewport(id)} title={id}><Icon icon={icon}/></button>)}</div>
      </div>
      <div className="design-v14-topbar-right">
        <span className={'design-v14-status '+(dirty?'dirty':'saved')}><i/>{dirty?'Kaydedilmedi':'Güncel'}</span>
        <button type="button" className="design-v14-top-btn" onClick={()=>{const host=window.location.hostname.toLowerCase();const blocked=host.endsWith('.hosted.app')||['ticarti.com','www.ticarti.com','login.ticarti.com','app.ticarti.com','academy.ticarti.com','superadmin.ticarti.com','dev.ticarti.com'].includes(host);const origin=blocked?'https://ticarti.com':window.location.origin;window.open(origin+'/','_blank','noopener,noreferrer')}}><Icon icon="iconoir:open-new-window"/> Vitrin</button>
        <button type="button" className="design-v14-top-btn primary" disabled={saving||!dirty} onClick={()=>void saveAll()}><Icon icon={saving?'iconoir:refresh-double':'iconoir:floppy-disk'} className={saving?'spin':''}/>{saving?'Kaydediliyor…':'Kaydet'}</button>
      </div>
    </div>

    {(msg||err)&&<div className={'design-v14-notice '+(err?'error':'success')}>{err||msg}</div>}

    <div className={'design-v14-workspace design-v15-workspace '+(sidebarCollapsed?'sidebar-collapsed':'')}>
      <aside className="design-v15-sidebar">
        <div className="design-v15-rail">
          <button type="button" onClick={()=>setSidebarCollapsed(false)} title="Tasarım panelini aç"><Icon icon="iconoir:sidebar-expand"/></button>
          {pageKey==='home'&&<button type="button" onClick={()=>{setSidebarCollapsed(false);openSections()}} title="Bölümler"><Icon icon="iconoir:component"/></button>}
          <button type="button" onClick={()=>{setSidebarCollapsed(false);openSettings('header')}} title="Header"><Icon icon="iconoir:panel-top"/></button>
          <button type="button" onClick={()=>{setSidebarCollapsed(false);openSettings('footer')}} title="Footer"><Icon icon="iconoir:panel-bottom"/></button>
          <button type="button" onClick={()=>{setSidebarCollapsed(false);openSettings('theme')}} title="Tema"><Icon icon="iconoir:palette"/></button>
        </div>
        <div className="design-v15-sidebar-shell">
          {panelMode==='root'&&rootPanel}
          {panelMode==='sections'&&sectionsPanel}
          {panelMode==='library'&&<ModuleLibrary query={moduleQuery} setQuery={setModuleQuery} allowed={allowedModules} onClose={panelBack} onAdd={def=>void addModule(def)}/>} 
          {panelMode==='settings'&&settingsPanel}
          {panelMode==='themes'&&themesPanel}
          {panelMode==='history'&&historyPanel}
        </div>
      </aside>

      <main className="design-v14-canvas design-v15-canvas">
        <div className={'design-v14-device '+viewport}>
          <div className="design-v14-browserbar"><i/><i/><i/><span>Canlı Önizleme</span><em>{PAGE_OPTIONS.find(x=>x[0]===pageKey)?.[1]} · gerçek mağaza verisi</em></div>
          {previewUrl?<iframe ref={previewRef} title="Canlı Önizleme" sandbox="allow-scripts allow-same-origin allow-forms" src={previewUrl} onLoad={()=>{const frame=previewRef.current?.contentWindow;if(!frame)return;frame.postMessage({source:'commerce-design-editor',action:'draft',kind:'design',design},'*');frame.postMessage({source:'commerce-design-editor',action:'draft',kind:'sections',sections},'*');frame.postMessage({source:'commerce-design-editor',action:'select',target:selected},'*')}}/>:<div className="design-v15-preview-loading">Canlı mağaza hazırlanıyor…</div>}
        </div>
      </main>
    </div>
  </div>;
}
function SidebarSubHeader({title,subtitle,onBack,action}:{title:string;subtitle:string;onBack:()=>void;action?:React.ReactNode}){return <div className="design-v15-subhead"><button type="button" className="design-v15-subhead-back" onClick={onBack} aria-label="Geri"><Icon icon="iconoir:arrow-left"/></button><div><b>{title}</b><small>{subtitle}</small></div>{action&&<div className="design-v15-subhead-action">{action}</div>}</div>}

function TreeLabel({text}:{text:string}){return <div className="design-v14-tree-label">{text}</div>}
function TreeItem({icon,label,subtitle,active,onClick}:{icon:string;label:string;subtitle:string;active:boolean;onClick:()=>void}){return <button type="button" className={'design-v14-tree-item '+(active?'active':'')} onClick={onClick}><span className="design-v14-item-icon"><Icon icon={icon}/></span><span className="design-v14-item-copy"><b>{label}</b><small>{subtitle}</small></span><Icon icon="iconoir:nav-arrow-right" className="design-v14-item-arrow"/></button>}

function SectionTreeItem({section,index,active,onSelect,onToggle,onDuplicate,onDelete,onDragStart,onDrop}:{section:any;index:number;active:boolean;onSelect:()=>void;onToggle:()=>void;onDuplicate:()=>void;onDelete:()=>void;onDragStart:()=>void;onDrop:()=>void}){
  return <div draggable onDragStart={onDragStart} onDragOver={e=>e.preventDefault()} onDrop={onDrop} className={'design-v14-section-row '+(active?'active ':'')+(section.enabled===false?'disabled':'')}>
    <span className="design-v14-grip" title="Sürükleyerek sırala"><Icon icon="iconoir:drag-hand-gesture"/></span>
    <button type="button" className="design-v14-section-main" onClick={onSelect}><span className="design-v14-item-icon"><Icon icon={blockIcon(section.sectionType)}/></span><span><b>{sectionTitle(section)}</b><small>{blockTitle(section.sectionType)} · #{index+1}</small></span></button>
    <div className="design-v14-section-actions"><button type="button" title={section.enabled===false?'Göster':'Gizle'} onClick={onToggle}><Icon icon={section.enabled===false?'iconoir:eye-closed':'iconoir:eye'}/></button><button type="button" title="Kopyala" onClick={onDuplicate}><Icon icon="iconoir:copy"/></button><button type="button" title="Sil" onClick={onDelete}><Icon icon="iconoir:trash"/></button></div>
  </div>
}

function ModuleLibrary({query,setQuery,allowed,onClose,onAdd}:{query:string;setQuery:(v:string)=>void;allowed:Set<string>;onClose:()=>void;onAdd:(def:ModuleDef)=>void}){
  const q=query.trim().toLocaleLowerCase('tr');
  return <div className="design-v14-library"><div className="design-v14-library-head"><button type="button" onClick={onClose}><Icon icon="iconoir:arrow-left"/></button><div><b>Bölüm Ekle</b><small>Tema modül kütüphanesi</small></div></div><div className="design-v14-library-search"><Icon icon="iconoir:search"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Modül ara..."/></div><div className="design-v14-library-scroll">{MODULE_GROUPS.map(group=>{const items=group.items.filter(x=>(!allowed.size||allowed.has(x.type))&&(!q||`${x.label} ${x.description}`.toLocaleLowerCase('tr').includes(q)));if(!items.length)return null;return <div className="design-v14-module-group" key={group.title}><div className="design-v14-module-title"><Icon icon={group.icon}/>{group.title}</div><div className="design-v14-module-grid">{items.map(def=><button type="button" key={def.type} onClick={()=>onAdd(def)} title={def.description}><span><Icon icon={def.icon}/></span><b>{def.label}</b><small>{def.description}</small></button>)}</div></div>})}</div></div>
}

function SettingsPanel({selected,section,design,updateDesign,updateSection,onDelete}:{selected:string;section:any;design:any;updateDesign:(group:string,key:string,value:any)=>void;updateSection:(patch:any)=>void;onDelete:()=>void}){
  if(selected==='theme')return <Panel title="Tema Ayarları" subtitle="Mağazanın genel görünüm dili" icon="iconoir:palette"><ThemeSettings design={design} update={updateDesign}/></Panel>;
  if(selected==='topbar')return <Panel title="Duyuru Barı" subtitle="Tüm sayfaların üstünde" icon="iconoir:megaphone"><Switch label="Duyuru barını göster" checked={!!design?.header?.topbarEnabled} onChange={v=>updateDesign('header','topbarEnabled',v)}/><Field label="Metin" value={design?.header?.topbarText||''} onChange={v=>updateDesign('header','topbarText',v)} placeholder="750 TL üzeri ücretsiz kargo"/><Field label="Link" value={design?.header?.topbarLink||''} onChange={v=>updateDesign('header','topbarLink',v)} placeholder="/kampanya"/></Panel>;
  if(selected==='header')return <Panel title="Header" subtitle="Logo, menü ve üst alan" icon="iconoir:panel-top"><TemplateMini count={8} value={num(design?.header?.template,1)} label="Header" onChange={v=>updateDesign('header','template',v)}/><SectionHead text="Davranış"/><Switch label="Sticky header" checked={design?.header?.sticky!==false} onChange={v=>updateDesign('header','sticky',v)}/><Switch label="Arama göster" checked={!!design?.header?.showSearch} onChange={v=>updateDesign('header','showSearch',v)}/><SectionHead text="Duyuru Barı"/><Switch label="Duyuru barını göster" checked={!!design?.header?.topbarEnabled} onChange={v=>updateDesign('header','topbarEnabled',v)}/><Field label="Metin" value={design?.header?.topbarText||''} onChange={v=>updateDesign('header','topbarText',v)} placeholder="Duyuru metni"/><Field label="Link" value={design?.header?.topbarLink||''} onChange={v=>updateDesign('header','topbarLink',v)} placeholder="/kampanya"/></Panel>;
  if(selected==='footer')return <Panel title="Footer" subtitle="Tüm sayfaların altında" icon="iconoir:panel-bottom"><TemplateMini count={5} value={num(design?.footer?.template,1)} label="Footer" onChange={v=>updateDesign('footer','template',v)}/><Field label="Copyright" value={design?.footer?.copyright||''} onChange={v=>updateDesign('footer','copyright',v)} placeholder="© {{year}} {{store_name}}"/><Area label="Footer üstü HTML" value={design?.footer?.upperHtml||''} onChange={v=>updateDesign('footer','upperHtml',v)} rows={5}/></Panel>;
  if(selected==='product'||selected==='product-card'||selected==='category')return <Panel title={selected==='category'?'Kategori Tasarımı':selected==='product-card'?'Ürün Kartı':'Ürün Sayfası'} subtitle="Şablon ve grid görünümü" icon="iconoir:box-iso"><ProductPanel selected={selected} design={design} update={updateDesign}/></Panel>;
  if(selected==='blog')return <Panel title="Blog Görünümü" subtitle="Global tema ayarlarını kullanır" icon="iconoir:book"><div className="design-v14-help">Blog liste ve detay sayfası seçtiğiniz renk, tipografi, header ve footer ayarlarını otomatik kullanır. İçerikleri Blog menüsünden yönetebilirsiniz.</div><button type="button" className="btn btn-outline-primary w-100" onClick={()=>window.location.href='/blog/posts'}>Blog Yazılarına Git</button></Panel>;
  if(selected==='info')return <Panel title="Bilgilendirme Sayfaları" subtitle="Sayfalar modülü ile içerik" icon="iconoir:page"><div className="design-v14-help">Kurumsal ve sözleşme sayfaları bu tema ayarlarını kullanır. Sayfa içeriği, SEO ve dile göre slug alanları Sayfalar bölümünden yönetilir.</div><button type="button" className="btn btn-outline-primary w-100" onClick={()=>window.location.href='/pages'}>Sayfalara Git</button></Panel>;
  if(section)return <Panel title={sectionTitle(section)} subtitle={blockTitle(section.sectionType)} icon={blockIcon(section.sectionType)}><SectionSettings section={section} update={updateSection}/><button type="button" className="btn btn-outline-danger w-100 mt-3" onClick={onDelete}><Icon icon="iconoir:trash" className="me-1"/>Bölümü Sil</button></Panel>;
  return <div className="design-v14-empty-settings"><Icon icon="iconoir:cursor-pointer"/><b>Düzenlemek için bir alan seçin</b><span>Sol taraftaki bölüm veya global alanlardan birine tıklayın.</span></div>;
}

function Panel({title,subtitle,icon,children}:{title:string;subtitle:string;icon:string;children:React.ReactNode}){return <div className="design-v14-panel"><div className="design-v14-panel-head"><span><Icon icon={icon}/></span><div><b>{title}</b><small>{subtitle}</small></div></div><div className="design-v14-panel-body">{children}</div></div>}

function ThemeSettings({design,update}:{design:any;update:(group:string,key:string,value:any)=>void}){const g=design?.general||{};return <>
  <SectionHead text="Tipografi"/>
  <label className="design-v14-field"><span>Metin yazı tipi</span><select value={g.bodyFont||FONT_OPTIONS[0][0]} onChange={e=>update('general','bodyFont',e.target.value)}>{FONT_OPTIONS.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
  <label className="design-v14-field"><span>Başlık yazı tipi</span><select value={g.headingFont||FONT_OPTIONS[0][0]} onChange={e=>update('general','headingFont',e.target.value)}>{FONT_OPTIONS.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
  {[['h1Font','H1 yazı tipi'],['h2Font','H2 yazı tipi'],['h3Font','H3 yazı tipi'],['h4Font','H4 yazı tipi'],['h5Font','H5 yazı tipi'],['paragraphFont','Paragraf yazı tipi']].map(([key,label])=><label className="design-v14-field" key={key}><span>{label}</span><select value={g[key]||''} onChange={e=>update('general',key,e.target.value)}><option value="">Genel ayarı kullan</option>{FONT_OPTIONS.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>)}
  <div className="design-v14-three"><NumberField label="H1" value={g.h1Size} min={24} max={96} onChange={v=>update('general','h1Size',v)}/><NumberField label="H2" value={g.h2Size} min={20} max={72} onChange={v=>update('general','h2Size',v)}/><NumberField label="H3" value={g.h3Size} min={16} max={56} onChange={v=>update('general','h3Size',v)}/><NumberField label="H4" value={g.h4Size} min={14} max={44} onChange={v=>update('general','h4Size',v)}/><NumberField label="H5" value={g.h5Size} min={12} max={36} onChange={v=>update('general','h5Size',v)}/><NumberField label="Paragraf" value={g.paragraphSize||g.baseFontSize} min={11} max={28} onChange={v=>update('general','paragraphSize',v)}/></div>
  <SectionHead text="Renkler"/>
  <div className="design-v14-colors">{[['primaryColor','Ana'],['secondaryColor','İkincil'],['headingColor','Başlık'],['textColor','Metin'],['linkColor','Bağlantı'],['backgroundColor','Arka Plan'],['surfaceColor','Yüzey'],['borderColor','Border']].map(([key,label])=><ColorField key={key} label={label} value={g[key]} onChange={v=>update('general',key,v)}/>)}</div>
  <SectionHead text="Yerleşim"/>
  <label className="design-v14-field"><span>Sayfa genişliği</span><select value={g.layoutMode||'boxed'} onChange={e=>update('general','layoutMode',e.target.value)}><option value="full">Full width</option><option value="boxed">Boxed</option><option value="custom">Özel genişlik</option></select></label>{g.layoutMode==='custom'?<NumberField label="Özel genişlik" value={g.customWidth||g.containerWidth} min={760} max={2400} suffix="px" onChange={v=>update('general','customWidth',v)}/>:g.layoutMode!=='full'?<NumberField label="Site genişliği" value={g.containerWidth} min={760} max={1800} suffix="px" onChange={v=>update('general','containerWidth',v)}/>:null}<NumberField label="Bölüm aralığı" value={g.sectionSpacing} min={16} max={160} suffix="px" onChange={v=>update('general','sectionSpacing',v)}/><div className="design-v14-two"><NumberField label="Kart köşesi" value={g.borderRadius} min={0} max={40} suffix="px" onChange={v=>update('general','borderRadius',v)}/><NumberField label="Buton köşesi" value={g.buttonRadius} min={0} max={40} suffix="px" onChange={v=>update('general','buttonRadius',v)}/></div><Area label="Özel CSS" value={g.customCss||''} onChange={v=>update('general','customCss',v)} rows={6}/>
</>}

function ProductPanel({selected,design,update}:{selected:string;design:any;update:(group:string,key:string,value:any)=>void}){const p=design?.products||{};if(selected==='category')return <><TemplateMini count={8} value={num(p.categoryTemplate,1)} label="Kategori" onChange={v=>update('products','categoryTemplate',v)}/><GridFields p={p} update={update}/></>;if(selected==='product-card')return <><TemplateMini count={4} value={num(p.productCardTemplate,1)} label="Kart" onChange={v=>update('products','productCardTemplate',v)}/><GridFields p={p} update={update}/></>;return <TemplateMini count={8} value={num(p.productPageTemplate,1)} label="Ürün" onChange={v=>update('products','productPageTemplate',v)}/>}
function GridFields({p,update}:{p:any;update:(group:string,key:string,value:any)=>void}){return <div className="design-v14-three mt-3"><NumberField label="Desktop" value={p.columnsDesktop} min={1} max={6} onChange={v=>update('products','columnsDesktop',v)}/><NumberField label="Tablet" value={p.columnsTablet} min={1} max={4} onChange={v=>update('products','columnsTablet',v)}/><NumberField label="Mobil" value={p.columnsMobile} min={1} max={2} onChange={v=>update('products','columnsMobile',v)}/></div>}

function SectionSettings({section,update}:{section:any;update:(patch:any)=>void}){const s=section.settings||{};return <>
  <Field label="Başlık" value={s.title||''} onChange={v=>update({title:v})}/><Field label="Alt başlık" value={s.subtitle||''} onChange={v=>update({subtitle:v})}/><Area label="İçerik" value={s.content||''} onChange={v=>update({content:v})} rows={4}/>
  <SectionHead text="Kolon"/><div className="design-v14-three"><SelectNumber label="Desktop" value={num(s.colDesktop,12)} values={[12,9,8,6,4,3]} onChange={v=>update({colDesktop:v})}/><SelectNumber label="Tablet" value={num(s.colTablet,12)} values={[12,8,6,4]} onChange={v=>update({colTablet:v})}/><SelectNumber label="Mobil" value={num(s.colMobile,12)} values={[12,6]} onChange={v=>update({colMobile:v})}/></div>
  {!['spacer','divider'].includes(section.sectionType)&&<><Field label="Görsel URL" value={s.imageUrl||''} onChange={v=>update({imageUrl:v})} placeholder="https://..."/><Field label="Link" value={s.linkUrl||''} onChange={v=>update({linkUrl:v})} placeholder="/products"/><div className="design-v14-two"><NumberField label="İçerik adedi" value={s.count} min={1} max={24} onChange={v=>update({count:v})}/><label className="design-v14-field"><span>Hizalama</span><select value={s.textAlign||'left'} onChange={e=>update({textAlign:e.target.value})}><option value="left">Sol</option><option value="center">Orta</option><option value="right">Sağ</option></select></label></div></>}
  {['hero','banner','image_text'].includes(section.sectionType)&&<Field label="Buton metni" value={s.buttonText||''} onChange={v=>update({buttonText:v})} placeholder="İncele"/>}
  {section.sectionType==='html'&&<Area label="HTML" value={s.html||''} onChange={v=>update({html:v})} rows={8}/>} 
  {['instagram','twitter'].includes(section.sectionType)&&<Field label="Hesap" value={s.handle||''} onChange={v=>update({handle:v})} placeholder="@marka"/>}
  {section.sectionType==='video'&&<Field label="Video URL" value={s.videoUrl||''} onChange={v=>update({videoUrl:v})}/>} 
  {section.sectionType==='countdown'&&<Field label="Bitiş tarihi" type="datetime-local" value={s.endsAt||''} onChange={v=>update({endsAt:v})}/>} 
  {section.sectionType==='spacer'&&<NumberField label="Boşluk yüksekliği" value={s.height} min={20} max={400} suffix="px" onChange={v=>update({height:v})}/>} 
</>}

function SectionHead({text}:{text:string}){return <div className="design-v14-section-head">{text}</div>}
function Field({label,value,onChange,placeholder='',type='text'}:{label:string;value:any;onChange:(v:string)=>void;placeholder?:string;type?:string}){return <label className="design-v14-field"><span>{label}</span><input type={type} value={value??''} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></label>}
function Area({label,value,onChange,rows=4}:{label:string;value:any;onChange:(v:string)=>void;rows?:number}){return <label className="design-v14-field"><span>{label}</span><textarea rows={rows} value={value??''} onChange={e=>onChange(e.target.value)}/></label>}
function NumberField({label,value,onChange,min,max,suffix}:{label:string;value:any;onChange:(v:number)=>void;min:number;max:number;suffix?:string}){return <label className="design-v14-field"><span>{label}</span><div className="design-v14-number"><input type="number" value={value??''} min={min} max={max} onChange={e=>onChange(Number(e.target.value))}/>{suffix&&<em>{suffix}</em>}</div></label>}
function SelectNumber({label,value,values,onChange}:{label:string;value:number;values:number[];onChange:(v:number)=>void}){return <label className="design-v14-field"><span>{label}</span><select value={value} onChange={e=>onChange(Number(e.target.value))}>{values.map(v=><option value={v} key={v}>{v}/12</option>)}</select></label>}
function ColorField({label,value,onChange}:{label:string;value:any;onChange:(v:string)=>void}){const v=String(value||'#000000');return <label className="design-v14-color"><span>{label}</span><div><input type="color" value={/^#[0-9a-f]{6}$/i.test(v)?v:'#000000'} onChange={e=>onChange(e.target.value)}/><code>{v}</code></div></label>}
function Switch({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){return <label className="design-v14-switch"><span>{label}</span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><i/></label>}
function TemplateMini({count,value,label,onChange}:{count:number;value:number;label:string;onChange:(v:number)=>void}){return <div className="design-v14-template-grid">{Array.from({length:count},(_,i)=>i+1).map(n=><button type="button" key={n} className={value===n?'active':''} onClick={()=>onChange(n)}><span><i/><i/><i/></span><b>{label} {n}</b>{value===n&&<Icon icon="iconoir:check-circle"/>}</button>)}</div>}

function previewDocument(design:any,sections:any[],data:any,pageKey:PageKey,selected:string){
  const g=design?.general||{};const h=design?.header||{};const f=design?.footer||{};const p=design?.products||{};
  const products=arr(data?.products);const categories=arr(data?.categories);const blogs=arr(data?.blogPosts);const brands=arr(data?.brands);const reviews=arr(data?.reviews).filter((x:any)=>String(x?.status||'')==='APPROVED');
  const storeName=String(data?.store?.name||'Mağaza');
  const priceOf=(row:any)=>Number(row?.variants?.[0]?.price||0);
  const empty=(label:string)=>`<div class="preview-empty">${esc(label)}</div>`;
  const productCards=(count=4)=>{const rows=products.slice(0,Math.max(1,Math.min(8,count)));if(!rows.length)return empty('Henüz ürün eklenmedi.');return rows.map((row:any)=>{const img=row?.images?.[0]?.url;const price=priceOf(row);return `<article class="card product-card"><div class="img"${img?` style="background-image:url('${esc(img)}')"`:''}></div>${row?.brand?.name?`<small>${esc(row.brand.name)}</small>`:''}<b>${esc(row?.title||'İsimsiz ürün')}</b><span>${price?`${price.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})} TL`:'Fiyat girilmedi'}</span></article>`}).join('')};
  const categoryCards=(count=6)=>{const rows=categories.slice(0,Math.max(1,Math.min(8,count)));if(!rows.length)return empty('Henüz kategori eklenmedi.');return rows.map((row:any)=>`<div class="category-card"><div class="cat-img"${row?.imageUrl?` style="background-image:url('${esc(row.imageUrl)}')"`:''}></div><b>${esc(row?.name||'İsimsiz kategori')}</b></div>`).join('')};
  const blogCards=(count=3)=>{const rows=blogs.slice(0,Math.max(1,Math.min(6,count)));if(!rows.length)return empty('Henüz blog yazısı eklenmedi.');return rows.map((row:any)=>`<article class="blog-card"><div class="blog-img"${row?.featuredImageUrl?` style="background-image:url('${esc(row.featuredImageUrl)}')"`:''}></div><b>${esc(row?.title||'İsimsiz yazı')}</b>${row?.excerpt?`<p>${esc(row.excerpt)}</p>`:''}</article>`).join('')};
  const reviewCards=(count=4)=>{const rows=reviews.slice(0,Math.max(1,Math.min(6,count)));if(!rows.length)return empty('Henüz yayınlanmış müşteri yorumu yok.');return rows.map((row:any)=>`<article class="quote"><div>${'★'.repeat(Math.max(0,Math.min(5,Number(row.rating||0))))}</div>${row?.body||row?.title?`<p>${esc(row.body||row.title)}</p>`:''}<b>${esc(row?.authorName||'Müşteri')}</b></article>`).join('')};
  const brandCards=(count=8)=>{const rows=brands.slice(0,Math.max(1,Math.min(8,count)));if(!rows.length)return empty('Henüz marka eklenmedi.');return rows.map((row:any)=>`<div class="brand-item">${row?.logoUrl?`<img src="${esc(row.logoUrl)}" alt="${esc(row.name||'')}"/>`:`<b>${esc(row?.name||'İsimsiz marka')}</b>`}</div>`).join('')};
  const renderSection=(section:any)=>{const s=section.settings||{};const style=`--d:${Math.max(1,Math.min(12,num(s.colDesktop,12)))};--t:${Math.max(1,Math.min(12,num(s.colTablet,12)))};--m:${Math.max(1,Math.min(12,num(s.colMobile,12)))};text-align:${esc(s.textAlign||'left')}`;const type=section.sectionType;
    if(type==='hero'||type==='banner'){const hasContent=!!(s.title||s.subtitle||s.content||s.buttonText||s.imageUrl);return `<section class="module hero" style="${style}${s.imageUrl?`;background-image:linear-gradient(90deg,rgba(8,15,13,.54),rgba(8,15,13,.06)),url('${esc(s.imageUrl)}')`:''}">${hasContent?`${s.subtitle?`<small>${esc(s.subtitle)}</small>`:''}${s.title?`<h1>${esc(s.title)}</h1>`:''}${s.content?`<p>${esc(s.content)}</p>`:''}${s.buttonText?`<button>${esc(s.buttonText)}</button>`:''}`:empty('Bu bölüm henüz yapılandırılmadı.')}</section>`;}
    if(type==='products'||type==='product_slider')return `<section class="module" style="${style}">${s.title?`<div class="module-head"><h2>${esc(s.title)}</h2></div>`:''}<div class="products">${productCards(num(s.count,4))}</div></section>`;
    if(type==='categories'||type==='category_slider')return `<section class="module" style="${style}">${s.title?`<div class="module-head"><h2>${esc(s.title)}</h2></div>`:''}<div class="categories">${categoryCards(num(s.count,6))}</div></section>`;
    if(type==='blog')return `<section class="module" style="${style}">${s.title?`<div class="module-head"><h2>${esc(s.title)}</h2></div>`:''}<div class="blogs">${blogCards(num(s.count,3))}</div></section>`;
    if(type==='image_text'){const hasCopy=!!(s.title||s.subtitle||s.content);return `<section class="module image-text" style="${style}"><div class="edit-img"${s.imageUrl?` style="background-image:url('${esc(s.imageUrl)}')"`:''}></div><div>${hasCopy?`${s.subtitle?`<small>${esc(s.subtitle)}</small>`:''}${s.title?`<h2>${esc(s.title)}</h2>`:''}${s.content?`<p>${esc(s.content)}</p>`:''}`:empty('Bu bölüm henüz yapılandırılmadı.')}</div></section>`;}
    if(type==='reviews')return `<section class="module" style="${style}">${s.title?`<h2>${esc(s.title)}</h2>`:''}<div class="review-grid">${reviewCards(num(s.count,4))}</div></section>`;
    if(type==='brands')return `<section class="module" style="${style}">${s.title?`<h2>${esc(s.title)}</h2>`:''}<div class="brand-row">${brandCards(num(s.count,8))}</div></section>`;
    if(type==='newsletter')return `<section class="module newsletter" style="${style}"><div>${s.title?`<h2>${esc(s.title)}</h2>`:''}${s.content?`<p>${esc(s.content)}</p>`:''}</div><div><input placeholder="E-posta adresi"><button>${esc(s.buttonText||'Kaydol')}</button></div></section>`;
    if(type==='html')return `<section class="module" style="${style}">${cleanHtml(s.html||s.content||'<div class="preview-empty">HTML içeriği eklenmedi.</div>')}</section>`;
    if(type==='instagram'||type==='twitter')return `<section class="module" style="${style}">${s.title?`<h2>${esc(s.title)}</h2>`:''}<div class="social">${s.handle?esc(s.handle):'Sosyal medya hesabı bağlanmadı.'}</div></section>`;
    if(type==='spacer')return `<div class="module spacer" style="${style};height:${Math.max(20,num(s.height,60))}px"></div>`;
    if(type==='divider')return `<div class="module" style="${style}"><hr></div>`;
    return `<section class="module" style="${style}">${s.title?`<h2>${esc(s.title)}</h2>`:''}${s.content||s.subtitle?`<p>${esc(s.content||s.subtitle)}</p>`:empty('Bu bölüm henüz yapılandırılmadı.')}</section>`;
  };
  let body='';
  const markSection=(section:any,html:string)=>html.replace(/^<(section|div)/,`<$1 data-editor-target="section:${esc(section.id)}" data-editor-label="${esc(sectionTitle(section))}"`);
  if(pageKey==='home')body=`<main class="grid">${sections.filter(s=>s.enabled!==false).length?sections.filter(s=>s.enabled!==false).map((section:any)=>markSection(section,renderSection(section))).join(''):empty('Anasayfaya henüz bölüm eklenmedi.')}</main>`;
  else if(pageKey==='product'){
    const row=products[0];const img=row?.images?.[0]?.url;const second=row?.images?.[1]?.url;const variants=arr(row?.variants);const price=priceOf(row);
    body=row?`<main class="page"><div class="product-detail"><div class="gallery"><div${img?` style="background-image:url('${esc(img)}');background-size:cover;background-position:center"`:''}></div>${second?`<div style="background-image:url('${esc(second)}');background-size:cover;background-position:center"></div>`:''}</div><div class="product-copy">${row?.brand?.name?`<small>${esc(row.brand.name)}</small>`:''}<h1>${esc(row.title)}</h1><h3>${price?`${price.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})} TL`:'Fiyat girilmedi'}</h3>${row?.shortDescription||row?.description?`<p>${esc(row.shortDescription||row.description)}</p>`:''}${variants.length>1?`<div class="variant">${variants.slice(0,4).map((v:any)=>`<button>${esc(v.title||'Varyant')}</button>`).join('')}</div>`:''}<button class="cta">Sepete Ekle</button></div></div><section class="module"><h2>Diğer Ürünler</h2><div class="products">${productCards(4)}</div></section></main>`:`<main class="page">${empty('Ürün önizlemesi için mağazaya ürün ekleyin.')}</main>`;
  }
  else if(pageKey==='category')body=categories[0]?`<main class="page"><div class="category-hero"><h1>${esc(categories[0].name)}</h1></div><div class="category-layout"><aside>Filtreler</aside><div class="products">${productCards(8)}</div></div></main>`:`<main class="page">${empty('Kategori önizlemesi için mağazaya kategori ekleyin.')}</main>`;
  else if(pageKey==='blog')body=`<main class="page"><div class="category-hero"><h1>Blog</h1></div><div class="blogs">${blogCards(6)}</div></main>`;
  else body=`<main class="page article"><h1>Bilgilendirme Sayfası</h1>${empty('İçerik, Sayfalar modülündeki gerçek sayfalardan görüntülenecek.')}</main>`;
  const navItems=categories.slice(0,4).map((x:any)=>`<span>${esc(x.name)}</span>`).join('');
  const footerCopyright=esc(String(f.copyright||'© {{year}} {{store_name}}').replace('{{year}}',String(new Date().getFullYear())).replace('{{store_name}}',storeName));
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  *{box-sizing:border-box}body{margin:0;background:${esc(g.backgroundColor||'#fff')};color:${esc(g.textColor||'#15171a')};font:${num(g.baseFontSize,16)}px/1.55 ${g.bodyFont||'Inter,Arial,sans-serif'};letter-spacing:-.01em}h1,h2,h3{font-family:${g.headingFont||g.bodyFont||'Inter,Arial,sans-serif'};letter-spacing:-.035em}h1{font-size:${num(g.h1Size,52)}px;line-height:1.02}h2{font-size:${num(g.h2Size,34)}px;line-height:1.1}.topbar{padding:8px 20px;text-align:center;background:${esc(g.primaryColor||'#111')};color:white;font-size:12px}.header{position:${h.sticky===false?'static':'sticky'};top:0;z-index:5;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:19px max(24px,calc((100% - ${num(g.containerWidth,1180)}px)/2));border-bottom:1px solid ${esc(g.borderColor||'#e6e9ec')};background:${esc(g.surfaceColor||'#fff')};gap:20px}.logo{font-weight:850;letter-spacing:.04em}.nav{display:flex;gap:24px;font-size:13px}.tools{text-align:right}.grid,.page{max-width:${num(g.containerWidth,1180)}px;margin:auto;padding:32px 24px 64px}.grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px}.module{grid-column:span var(--d,12);padding:${Math.max(18,num(g.sectionSpacing,64)/2)}px 0;border-radius:${num(g.borderRadius,8)}px;min-width:0}.module.hero{min-height:430px;padding:54px;display:flex;flex-direction:column;justify-content:center;background:#eef2f1 center/cover;color:${esc(g.textColor||'#15171a')};overflow:hidden}.module.hero[style*="background-image"]{color:#fff}.hero h1{max-width:650px;margin:10px 0 14px}.hero p{max-width:520px}.hero button,.newsletter button,.cta{width:max-content;border:0;background:${esc(g.primaryColor||'#15171a')};color:white;padding:12px 18px;border-radius:${num(g.buttonRadius,6)}px;font-weight:700}.module-head{display:flex;align-items:end;justify-content:space-between;margin-bottom:18px}.module-head h2{margin:0}.products{display:grid;grid-template-columns:repeat(${Math.max(1,Math.min(6,num(p.columnsDesktop,4)))},1fr);gap:14px}.product-card{display:flex;flex-direction:column;gap:5px}.product-card .img{aspect-ratio:4/5;background:#edf0ef center/cover;border-radius:${num(g.borderRadius,8)}px}.product-card small{margin-top:7px;color:${esc(g.secondaryColor||'#727b85')};font-size:10px;letter-spacing:.08em}.product-card b{font-size:13px}.product-card span{font-size:12px}.categories{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.category-card .cat-img{aspect-ratio:1;background:#edf0ef center/cover;border-radius:50%}.category-card{text-align:center}.category-card b{display:block;margin-top:8px;font-size:12px}.blogs{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.blog-img{aspect-ratio:16/10;background:#edf0ef center/cover;border-radius:${num(g.borderRadius,8)}px}.blog-card b{display:block;margin-top:10px}.blog-card p{color:${esc(g.secondaryColor||'#727b85')};font-size:12px}.image-text{display:grid;grid-template-columns:1fr 1fr;gap:30px;align-items:center}.edit-img{min-height:340px;background:#edf0ef center/cover;border-radius:${num(g.borderRadius,8)}px}.review-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.quote{padding:22px;background:#f5f7f6;border-radius:${num(g.borderRadius,8)}px}.brand-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.brand-item{min-height:72px;display:grid;place-items:center;padding:14px;text-align:center;border:1px solid ${esc(g.borderColor||'#e6e9ec')};border-radius:${num(g.borderRadius,8)}}.brand-item img{max-width:100%;max-height:42px;object-fit:contain}.newsletter{display:flex;justify-content:space-between;align-items:center;background:#f4f7f5;padding:28px}.newsletter input{padding:12px;border:1px solid ${esc(g.borderColor||'#ddd')};border-radius:${num(g.buttonRadius,6)}px}.social{padding:32px;text-align:center;border:1px dashed ${esc(g.borderColor||'#ddd')};border-radius:${num(g.borderRadius,8)}px;color:${esc(g.secondaryColor||'#727b85')}.spacer{padding:0}.footer{background:#0b1f1a;color:#fff;padding:42px max(24px,calc((100% - ${num(g.containerWidth,1180)}px)/2));display:flex;align-items:flex-end;justify-content:space-between;gap:30px}.footer small{display:block;color:#94a39f;margin-top:8px}.product-detail{display:grid;grid-template-columns:1.15fr .85fr;gap:40px;margin:24px 0 60px}.gallery{display:grid;grid-template-columns:1fr 1fr;gap:10px}.gallery div{aspect-ratio:4/5;background:#edf0ef;border-radius:${num(g.borderRadius,8)}px}.product-copy{padding:20px}.variant{display:flex;gap:8px;margin:20px 0}.variant button{background:#fff;border:1px solid #dfe5e2;padding:9px 14px;border-radius:6px}.category-hero{padding:40px 0 30px}.category-layout{display:grid;grid-template-columns:190px 1fr;gap:28px}.category-layout aside{font-size:12px;color:#66736f}.article{max-width:760px}.preview-empty{grid-column:1/-1;padding:28px;border:1px dashed ${esc(g.borderColor||'#dfe5e2')};border-radius:${num(g.borderRadius,8)}px;background:#fafbfb;color:${esc(g.secondaryColor||'#727b85')};text-align:center;font-size:13px}@media(max-width:780px){.nav{display:none}.header{grid-template-columns:1fr 1fr}.header .tools{display:none}.grid{display:block}.module{margin-bottom:12px}.products{grid-template-columns:repeat(${Math.max(1,Math.min(2,num(p.columnsMobile,2)))},1fr)}.categories{grid-template-columns:repeat(2,1fr)}.blogs,.image-text,.product-detail,.category-layout,.review-grid{grid-template-columns:1fr}.category-layout aside{display:none}.footer{display:block}.module.hero{min-height:360px;padding:30px}h1{font-size:${Math.min(46,num(g.h1Size,52))}px}}
  [data-editor-target]{cursor:pointer;transition:outline-color .12s ease,box-shadow .12s ease,opacity .16s ease,filter .16s ease}[data-editor-target]:hover{outline:2px solid #10b981;outline-offset:-2px;box-shadow:0 0 0 4px rgba(16,185,129,.08)}[data-editor-target]{position:relative}[data-editor-target]::before{pointer-events:none}
  ${selected&&selected!=='theme'&&selected!=='product'&&selected!=='product-card'&&selected!=='category'&&selected!=='blog'&&selected!=='info'?`[data-editor-target="${esc(selected)}"]{outline:3px solid #10b981!important;outline-offset:-3px;box-shadow:0 0 0 5px rgba(16,185,129,.13)!important;opacity:1!important;filter:none!important;position:relative;z-index:4}[data-editor-target="${esc(selected)}"]::before{content:attr(data-editor-label);position:absolute;top:8px;left:8px;z-index:9999;background:#0b1f1a;color:#fff;border-radius:6px;padding:5px 8px;font:700 10px/1.2 Inter,Arial,sans-serif;letter-spacing:0;box-shadow:0 4px 12px rgba(11,31,26,.18)}${pageKey==='home'&&selected.startsWith('section:')?`.grid>[data-editor-target^="section:"]:not([data-editor-target="${esc(selected)}"]){opacity:.32;filter:saturate(.35)}`:''}`:''}
  ${cleanHtml(g.customCss||'')}
  
</style></head><body>${h.topbarEnabled?`<div class="topbar" data-editor-target="topbar" data-editor-label="Duyuru Barı">${esc(h.topbarText||'')}</div>`:''}<header class="header header-${num(h.template,1)}" data-editor-target="header" data-editor-label="Header"><div class="logo">${esc(storeName)}</div><nav class="nav">${navItems}</nav><div class="tools">${h.showSearch?'⌕　':''}♡　Sepet</div></header>${body}<footer class="footer footer-${num(f.template,1)}" data-editor-target="footer" data-editor-label="Footer"><div><b>${esc(storeName)}</b><small>${footerCopyright}</small></div><small>Footer bağlantıları mağaza menülerinizden gelir.</small></footer><script>document.addEventListener('click',function(event){var node=event.target&&event.target.closest?event.target.closest('[data-editor-target]'):null;if(!node)return;event.preventDefault();event.stopPropagation();parent.postMessage({source:'commerce-design-preview',target:node.getAttribute('data-editor-target')},'*')},true);var target=${JSON.stringify(selected)};if(target){requestAnimationFrame(function(){var selectedNode=document.querySelector('[data-editor-target=\"'+CSS.escape(target)+'\"]');if(selectedNode)selectedNode.scrollIntoView({block:'center',behavior:'smooth'})})}</script></body></html>`;
}

function moduleDef(type:string){for(const group of MODULE_GROUPS){const found=group.items.find(x=>x.type===type);if(found)return found}return null}
function blockTitle(type:string){return moduleDef(type)?.label||type}
function blockIcon(type:string){return moduleDef(type)?.icon||'iconoir:component'}
