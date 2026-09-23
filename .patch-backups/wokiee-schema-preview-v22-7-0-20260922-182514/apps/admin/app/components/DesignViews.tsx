'use client';

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
type MenuItem={id:string;label:string;url:string;type:string;badge?:string;imageUrl?:string;description?:string;columns?:number;children:MenuItem[]};
const MENU_LOCATIONS=[['header-main','Ana Menü'],['header-categories','Kategori Mega Menü'],['mobile-main','Mobil Menü'],['footer-main','Footer Menü']] as const;
const menuUid=()=>`menu-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const emptyMenuItem=():MenuItem=>({id:menuUid(),label:'Yeni bağlantı',url:'/',type:'link',columns:4,children:[]});
function normalizeMenuItems(value:any):MenuItem[]{return(Array.isArray(value)?value:[]).map((row:any)=>({id:String(row.id||menuUid()),label:String(row.label||row.title||'Bağlantı'),url:String(row.url||'/'),type:String(row.type||'link'),badge:String(row.badge||''),imageUrl:String(row.imageUrl||''),description:String(row.description||''),columns:Number(row.columns||4),children:normalizeMenuItems(row.children)}))}
function menuWalk(rows:MenuItem[],id:string,fn:(row:MenuItem)=>MenuItem):MenuItem[]{return rows.map(row=>row.id===id?fn(row):({...row,children:menuWalk(row.children||[],id,fn)}))}
function menuRemove(rows:MenuItem[],id:string):MenuItem[]{return rows.filter(row=>row.id!==id).map(row=>({...row,children:menuRemove(row.children||[],id)}))}
function menuFind(rows:MenuItem[],id:string):MenuItem|undefined{for(const row of rows){if(row.id===id)return row;const found=menuFind(row.children||[],id);if(found)return found}return undefined}


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
  ['Inter, ui-sans-serif, system-ui, sans-serif','Inter / Sistem'],
  ['"Be Vietnam Pro", ui-sans-serif, sans-serif','Be Vietnam Pro'],
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
  const editorMode=params.get('editor')==='1'||!!initialTab;
  const editorThemeId=String(params.get('themeId')||'');
  const editorSkinParam=String(params.get('skinSlug')||'');
  const initialPage:PageKey=initialTab==='products'?'product':'home';
  const initialSelection=initialTab==='header'?'header':initialTab==='footer'?'footer':initialTab==='menu'?'menu':initialTab==='general'?'theme':initialTab==='products'?'product':'';
  const initialPanel:PanelMode=initialSelection?'settings':'root';
  const[design,setDesign]=useState<any>(()=>clone(data.design||{}));
  const[sections,setSections]=useState<any[]>(()=>clone(arr(data.sections)));
  const[menus,setMenus]=useState<any[]>(()=>clone(arr(data.menus)));
  const[pageKey,setPageKey]=useState<PageKey>(initialPage);
  const[selected,setSelected]=useState<string>(initialSelection);
  const[panelMode,setPanelMode]=useState<PanelMode>(initialPanel);
  const[themes,setThemes]=useState<any[]>([]);const[themeErr,setThemeErr]=useState('');
  const[history,setHistory]=useState<any[]>([]);const[historyErr,setHistoryErr]=useState('');const[loadThemeModules,setLoadThemeModules]=useState(true);const[themeSkinSelection,setThemeSkinSelection]=useState<Record<string,string>>({});
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
  const draftInitRef=useRef('');

  function sendDraft(message:any){const frame=previewRef.current?.contentWindow;if(!frame)return;frame.postMessage({source:'commerce-design-editor',action:'draft',...message},'*')}

  useEffect(()=>{setDesign(clone(data.design||{}));setSections(clone(arr(data.sections)));setMenus(clone(arr(data.menus)));setDirty(false)},[data.design,data.sections,data.menus]);

  useEffect(()=>{const onBeforeUnload=(event:BeforeUnloadEvent)=>{if(!dirty)return;event.preventDefault();event.returnValue='Kaydetmediğiniz değişiklikler kaybolacak.'};window.addEventListener('beforeunload',onBeforeUnload);return()=>window.removeEventListener('beforeunload',onBeforeUnload)},[dirty]);

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
  const themeName=String(design?.general?.themeName||'Demo 1');
  const currentTheme=themes.find((t:any)=>t.current)||themes[0];const allowedModules:Set<string>=new Set<string>(((currentTheme?.config?.modules||[]) as any[]).filter((m:any)=>m.enabled!==false).map((m:any)=>String(m.type)));
  const savedSkinSlug=String(data.design?.general?.skinSlug||data.design?.general?.skin||currentTheme?.config?.activeSkin||currentTheme?.config?.defaultSkin||'demo-1');
  const currentSkinSlug=String(design?.general?.skinSlug||design?.general?.skin||savedSkinSlug);
  function chosenSkin(t:any){const skins=Array.isArray(t?.config?.skins)?t.config.skins:[];return String(themeSkinSelection[String(t.id)]||(t.current?currentSkinSlug:'')||t?.config?.activeSkin||t?.config?.defaultSkin||skins[0]?.slug||'')}
  function chosenSkinConfig(t:any){const slug=chosenSkin(t);return (Array.isArray(t?.config?.skins)?t.config.skins:[]).find((x:any)=>String(x.slug)===slug)||null}

  function sourceFor(t:any,skinSlug:string){const skins=Array.isArray(t?.config?.skins)?t.config.skins:[];const skin=skins.find((x:any)=>String(x.slug)===String(skinSlug))||skins[0]||null;const sourceDesign=clone(skin?.design||t?.config?.design||{});if(sourceDesign?.general){sourceDesign.general={...sourceDesign.general,skinSlug:String(skin?.slug||skinSlug),skin:String(skin?.slug||skinSlug),skinName:String(skin?.name||skinSlug)}}const preset=clone(Array.isArray(skin?.homePreset)?skin.homePreset:(Array.isArray(t?.config?.homePreset)?t.config.homePreset:[]));return {skin,design:sourceDesign,sections:preset.map((x:any,i:number)=>{const sourceId=String(x.sourceId||x.settings?.__sourceId||`${skinSlug}-${i}`);return {id:`draft:${sourceId}:${i}`,sourceId,pageKey:'home',sectionType:String(x.sectionType||'rich_text'),sortOrder:i,enabled:x.enabled!==false,settings:{...(x.settings||{}),__sourceId:sourceId}}})}}
  function adminBrowserPath(path:string){const clean=path.startsWith('/')?path:`/${path}`;return clean.startsWith('/admin/')||clean==='/admin'?clean:`/admin${clean}`}
  function guardNavigate(url:string){if(dirty&&!window.confirm('Kaydetmediğiniz değişiklikler var. Çıkarsanız yaptıklarınız kaybolacak. Devam edilsin mi?'))return;window.location.href=adminBrowserPath(url)}
  function openThemeEditor(theme:any,skinSlug:string){const url=new URL(adminBrowserPath('/design-content'),window.location.origin);url.searchParams.set('editor','1');url.searchParams.set('themeId',String(theme.id));url.searchParams.set('skinSlug',String(skinSlug));window.location.assign(url.toString())}

  function updateDesign(group:string,key:string,value:any){setDesign((current:any)=>{const next={...current,[group]:{...(current?.[group]||{}),[key]:value}};sendDraft({kind:'design',design:next});return next});setDirty(true);setMsg('')}
  function updateSection(id:string,patch:any){setSections(current=>{const next=current.map(row=>String(row.id)===id?{...row,...patch,settings:patch.settings?{...(row.settings||{}),...patch.settings}:row.settings}:row);const section=next.find(row=>String(row.id)===id);if(section)sendDraft({kind:'section',section});return next});setDirty(true);setMsg('')}

  function updateMenus(next:any[]){setMenus(next);sendDraft({kind:'menus',menus:next});setDirty(true);setMsg('')}

  useEffect(()=>{if(!sid)return;req('/admin/themes?storeId='+encodeURIComponent(sid)).then(setThemes).catch((e:any)=>setThemeErr(e?.message||'Temalar yüklenemedi.'));req('/admin/design/history?storeId='+encodeURIComponent(sid)).then(setHistory).catch((e:any)=>setHistoryErr(e?.message||'Geçmiş yüklenemedi.'))},[sid]);

  useEffect(()=>{if(!editorMode||!themes.length)return;const target=themes.find((t:any)=>String(t.id)===editorThemeId)||themes.find((t:any)=>t.current)||themes[0];if(!target)return;const skinSlug=String(editorSkinParam||chosenSkin(target));const key=`${target.id}:${skinSlug}`;if(draftInitRef.current===key)return;draftInitRef.current=key;const persisted=!!target.current&&skinSlug===savedSkinSlug;if(persisted)return;const source=sourceFor(target,skinSlug);setDesign(source.design);setSections(source.sections);setSelected('');setPanelMode('root');setPageKey('home');setDirty(true);setMsg('');sendDraft({kind:'design',design:source.design});sendDraft({kind:'sections',sections:source.sections})},[editorMode,themes,editorThemeId,editorSkinParam]);
  function openSettings(target:string){setSelected(target);setPanelMode('settings')}
  function openSections(){setSelected('');setPanelMode('sections')}
  function panelBack(){
    if(panelMode==='library'){setPanelMode('sections');return;}
    if(panelMode==='themes'||panelMode==='history'){setPanelMode('root');return;}
    if(panelMode==='settings'&&selected.startsWith('section:')){setPanelMode('sections');return;}
    setPanelMode('root');
  }

  async function saveAll(){
    if(!window.confirm('Tema tasarımını kaydetmek istiyor musunuz? Kaydedilen değişiklikler mağazada kullanılacaktır.'))return;
    setSaving(true);setErr('');setMsg('');
    try{
      await req('/admin/design/history',{method:'POST',body:JSON.stringify({storeId:sid,reason:'MANUAL_SAVE',label:'Kaydetmeden önce'})});
      const targetTheme=themes.find((t:any)=>String(t.id)===editorThemeId)||currentTheme;const targetSkin=String(editorSkinParam||design?.general?.skinSlug||design?.general?.skin||currentSkinSlug);
      const needsActivation=!!targetTheme&&(!targetTheme.current||String(targetSkin)!==String(savedSkinSlug));
      if(needsActivation){await req('/admin/themes/'+targetTheme.id+'/activate',{method:'POST',body:JSON.stringify({storeId:sid,loadThemeModules:true,skinSlug:targetSkin})});}
      const nextDesign={...design,general:{...(design?.general||{}),skinSlug:targetSkin,skin:targetSkin}};
      const saved=await req('/admin/design/settings',{method:'PATCH',body:JSON.stringify({storeId:sid,design:nextDesign})});
      const savedSections=await req('/admin/design/sections/snapshot',{method:'PATCH',body:JSON.stringify({storeId:sid,pageKey:'home',items:sections.map((x:any,i:number)=>({sourceId:x.sourceId||x.settings?.__sourceId,sectionType:x.sectionType,sortOrder:i,enabled:x.enabled!==false,settings:x.settings||{}}))})});
      for(const menu of menus){await req('/admin/menus',{method:'POST',body:JSON.stringify({storeId:sid,name:menu.name||menu.handle||'Menü',handle:menu.handle,items:Array.isArray(menu.items)?menu.items:[]})});}
      setDesign(saved);setSections(savedSections);setDirty(false);setMsg('Tasarım kaydedildi.');setThemes(await req('/admin/themes?storeId='+encodeURIComponent(sid)));setHistory(await req('/admin/design/history?storeId='+encodeURIComponent(sid)));
    }catch(e:any){setErr(e?.message||'Tasarım kaydedilemedi.')}finally{setSaving(false)}
  }


  async function addModule(def:ModuleDef){
    const id='draft-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);const row={id,sourceId:'',pageKey:'home',sectionType:def.type,sortOrder:sections.length,enabled:true,settings:defaultSectionSettings(def.type,def.col)};
    setSections(current=>[...current,row]);setSelected('section:'+id);setPanelMode('settings');setDirty(true);setPageKey('home');
  }

  async function duplicateSection(section:any){
    const id='draft-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);const settings=clone(section.settings||{});delete settings.__sourceId;const row={...clone(section),id,sourceId:'',settings,sortOrder:sections.length};setSections(current=>[...current,row]);setSelected('section:'+id);setPanelMode('settings');setDirty(true);
  }

  async function deleteSection(id:string){
    if(!window.confirm('Bu bölümü tasarımdan kaldırmak istiyor musunuz? Değişiklik Kaydet ile uygulanacaktır.'))return;setSections(current=>current.filter(x=>String(x.id)!==id));setSelected('');setPanelMode('sections');setDirty(true);
  }


  function dropOn(targetId:string){
    if(!dragId||dragId===targetId)return setDragId('');
    setSections(current=>{const next=[...current];const from=next.findIndex(x=>String(x.id)===dragId);const to=next.findIndex(x=>String(x.id)===targetId);if(from<0||to<0)return current;const[item]=next.splice(from,1);next.splice(to,0,item);return next});setDragId('');setDirty(true);
  }

  function selectPage(next:PageKey){setPageKey(next);setSelected('');setPanelMode('root')}

  if(page==='overview'&&!editorMode){
    const sourceTheme=themes.find((t:any)=>t.current)||themes[0];const activeSkin=sourceTheme?(Array.isArray(sourceTheme.config?.skins)?sourceTheme.config.skins:[]).find((x:any)=>String(x.slug)===savedSkinSlug):null;const skins=sourceTheme&&Array.isArray(sourceTheme.config?.skins)?sourceTheme.config.skins:[];
    return <div className="design-v16-library-page">
      <div className="design-v16-library-head"><div><h1>Mağaza Tasarımı</h1><p>Aktif temanızı düzenleyin veya başka bir tema görünümü seçerek canlı tasarım alanında özelleştirin.</p></div></div>
      {themeErr&&<div className="design-v15-inline-error">{themeErr}</div>}
      {sourceTheme&&<section className="design-v16-current"><h2>Seçili tema</h2><div className="design-v16-current-card"><ThemeThumb slug={savedSkinSlug} image={sourceTheme.previewImageUrl}/><div className="design-v16-current-copy"><b>{activeSkin?.name||sourceTheme.name}</b><span>{sourceTheme.name} · {savedSkinSlug}</span><p>{sourceTheme.description||'Mağazanızda kullanılan aktif tema.'}</p></div><button type="button" onClick={()=>openThemeEditor(sourceTheme,savedSkinSlug)}>Edit theme</button></div></section>}
      <section className="design-v16-discover"><div className="design-v16-section-title"><div><h2>Temaları keşfet</h2><p>Bir tema seçtiğinizde canlı tasarım alanında açılır; kaydedene kadar mağazanız etkilenmez.</p></div></div><div className="design-v16-theme-grid">{sourceTheme&&skins.map((skin:any,i:number)=><button type="button" className={'design-v16-theme-card '+(String(skin.slug)===savedSkinSlug?'active':'')} key={skin.slug} onClick={()=>openThemeEditor(sourceTheme,String(skin.slug))}><ThemeThumb slug={String(skin.slug)} image={skin.previewImageUrl||sourceTheme.previewImageUrl} index={i}/><span className="design-v16-theme-name">{skin.name}</span><small>{skin.category||sourceTheme.category||'Tema'}</small></button>)}</div></section>
    </div>
  }

  const rootPanel=<>
    <div className="design-v15-sidebar-head"><div><b>{PAGE_OPTIONS.find(x=>x[0]===pageKey)?.[1]}</b><small>Canlı mağaza görünümünü buradan düzenleyin</small></div></div>
    <div className="design-v15-root-scroll">
      <TreeLabel text="Sayfa"/>
      {pageKey==='home'?<TreeItem icon="iconoir:component" label="Anasayfa Bölümleri" subtitle={`${sections.length} bölüm · sürükle, sırala, düzenle`} active={false} onClick={openSections}/>:pageKey==='product'?<><TreeItem icon="iconoir:box-iso" label="Ürün Sayfası" subtitle={`Şablon ${num(design?.products?.productPageTemplate,1)} · özellikleri seç`} active={false} onClick={()=>openSettings('product')}/><TreeItem icon="iconoir:view-grid" label="Ürün Kartı" subtitle={`Kart ${num(design?.products?.productCardTemplate,1)} · görünümü seç`} active={false} onClick={()=>openSettings('product-card')}/></>:pageKey==='category'?<TreeItem icon="iconoir:grid-xmark" label="Kategori Sayfası" subtitle={`Şablon ${num(design?.products?.categoryTemplate,1)} · filtre ve grid ayarları`} active={false} onClick={()=>openSettings('category')}/>:pageKey==='blog'?<TreeItem icon="iconoir:book" label="Blog Görünümü" subtitle="İçerik gerçek blog verilerinden gelir" active={false} onClick={()=>openSettings('blog')}/>:<TreeItem icon="iconoir:page" label="Bilgilendirme Sayfası" subtitle="İçerik Sayfalar modülünden gelir" active={false} onClick={()=>openSettings('info')}/>} 
      <TreeLabel text="Global"/>
      <TreeItem icon="iconoir:panel-top" label="Header" subtitle={`Header ${num(design?.header?.template,1)} · logo, duyuru, araçlar`} active={false} onClick={()=>openSettings('header')}/>
      <TreeItem icon="iconoir:menu-scale" label="Menü" subtitle="Ana menü, mega menü, mobil ve footer menüsü" active={false} onClick={()=>openSettings('menu')}/>
      <TreeItem icon="iconoir:panel-bottom" label="Footer" subtitle={`Footer ${num(design?.footer?.template,1)} · kolonlar, bülten ve alt alan`} active={false} onClick={()=>openSettings('footer')}/>
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
    <SidebarSubHeader title="Tema Kataloğu" subtitle="Tema ve skin görünümünü seçin" onBack={panelBack}/>
    <div className="design-v14-tree-scroll">
      {themeErr&&<div className="design-v15-inline-error">{themeErr}</div>}
      <label className="design-theme-import-option"><input type="checkbox" checked={loadThemeModules} onChange={e=>setLoadThemeModules(e.target.checked)}/><span><b>Tema modüllerini ve örnek içeriği yükle</b><small>Açıkken seçilen skinin anasayfa düzeniyle yeniden kurulur. Kapalıyken mevcut modüller korunur.</small></span></label>
      <div className="design-theme-list">{themes.map((t:any)=>{const skins=Array.isArray(t.config?.skins)?t.config.skins:[];const skinSlug=chosenSkin(t);const skin=chosenSkinConfig(t);const previewDesign=skin?.design||t.config?.design;const previewPreset=Array.isArray(skin?.homePreset)?skin.homePreset:t.config?.homePreset;return <div key={t.id} className={'design-theme-card '+(t.current?'active':'')}>
        <div className="design-theme-preview" style={{background:`linear-gradient(135deg,${previewDesign?.general?.primaryColor||t.config?.style?.accent||'#304ffe'}22,#fff)`}}><span>{skin?.category||t.category}</span><b>{skin?.name||t.name}</b><small>{Array.isArray(previewPreset)?`${previewPreset.length} bölüm preset`:'Tema preset'}</small></div>
        <div className="design-theme-meta"><div><b>{t.name}</b><small>{t.description}</small></div><em>{t.current?'Aktif':t.included?'Pakete dahil':t.owned?'Satın alındı':Number(t.price)>0?`${Number(t.price).toLocaleString('tr-TR')} ${t.currency}`:'Ücretsiz'}</em></div>
        {skins.length>0&&<label className="design-theme-import-option"><span><b>Skin / Demo</b><small>Seçilen skin kendi font, renk, header, footer ve modül presetini kullanır.</small></span><select value={skinSlug} onChange={e=>setThemeSkinSelection(cur=>({...cur,[String(t.id)]:e.target.value}))}>{skins.map((x:any)=><option key={x.slug} value={x.slug}>{x.name}</option>)}</select></label>}
        <div className="design-theme-actions"><button type="button" className="design-v15-light-btn" onClick={()=>{const frame=previewRef.current?.contentWindow;if(!frame)return;frame.postMessage({source:'commerce-design-editor',action:'draft',kind:'theme',theme:t,skinSlug},'*');if(previewDesign){const pd={...previewDesign,general:{...(previewDesign.general||{}),skinSlug,skin:skinSlug,skinName:skin?.name||skinSlug}};frame.postMessage({source:'commerce-design-editor',action:'draft',kind:'design',design:pd},'*')}if(loadThemeModules&&Array.isArray(previewPreset))frame.postMessage({source:'commerce-design-editor',action:'draft',kind:'sections',sections:previewPreset.map((x:any,i:number)=>({id:x.sourceId||('theme-preview-'+i),sourceId:x.sourceId,pageKey:'home',sectionType:x.sectionType,sortOrder:i,enabled:x.enabled!==false,settings:{...(x.settings||{}),...(x.sourceId?{__sourceId:x.sourceId}:{})}}))},'*')}}>Önizle</button>
          {t.current?<button type="button" className="design-v15-primary-btn" onClick={async()=>{try{const out=await req('/admin/themes/'+t.id+'/activate',{method:'POST',body:JSON.stringify({storeId:sid,loadThemeModules:true,skinSlug})});if(out?.design)setDesign(out.design);if(Array.isArray(out?.sections))setSections(out.sections);setDirty(false);setThemes(await req('/admin/themes?storeId='+encodeURIComponent(sid)));setHistory(await req('/admin/design/history?storeId='+encodeURIComponent(sid)));await reload()}catch(e:any){setThemeErr(e.message)}}}>Skin içeriğini yükle</button>:!t.current&&(t.owned||t.included||Number(t.price)===0)?<button type="button" className="design-v15-primary-btn" onClick={async()=>{try{const out=await req('/admin/themes/'+t.id+'/activate',{method:'POST',body:JSON.stringify({storeId:sid,loadThemeModules,skinSlug})});if(out?.design)setDesign(out.design);if(Array.isArray(out?.sections))setSections(out.sections);setDirty(false);setThemes(await req('/admin/themes?storeId='+encodeURIComponent(sid)));setHistory(await req('/admin/design/history?storeId='+encodeURIComponent(sid)));await reload()}catch(e:any){setThemeErr(e.message)}}}>Kullan</button>:!t.current?<button type="button" className="design-v15-primary-btn" onClick={async()=>{try{const out=await req('/admin/billing/iyzico/theme-checkout',{method:'POST',body:JSON.stringify({themeId:t.id})});if(out?.included||out?.owned){setThemes(await req('/admin/themes?storeId='+encodeURIComponent(sid)));return}if(out?.paymentUrl)window.location.href=out.paymentUrl}catch(e:any){setThemeErr(e.message)}}}>Satın al</button>:null}
        </div>
      </div>})}</div>
    </div>
  </>;

  const historyPanel=<>
    <SidebarSubHeader title="Tasarım Geçmişi" subtitle="Son 30 güvenli geri dönüş noktası" onBack={panelBack}/>
    <div className="design-v14-tree-scroll">{historyErr&&<div className="design-v15-inline-error">{historyErr}</div>}{history.length?<div className="design-history-list">{history.map((h:any)=><div className="design-history-card" key={h.id}><div><b>{h.label||'Tasarım sürümü'}</b><small>{new Date(h.createdAt).toLocaleString('tr-TR')} · {h.themeSlug}</small></div><button type="button" onClick={async()=>{if(!window.confirm('Bu tasarım sürümüne dönmek istiyor musunuz? Mevcut haliniz ayrıca otomatik yedeklenecek.'))return;try{await req('/admin/design/history/'+encodeURIComponent(h.id)+'/restore',{method:'POST',body:JSON.stringify({storeId:sid})});setHistory(await req('/admin/design/history?storeId='+encodeURIComponent(sid)));await reload();setMsg('Önceki tasarım geri yüklendi.');setPanelMode('root')}catch(e:any){setHistoryErr(e.message)}}}>Geri Yükle</button></div>)}</div>:<div className="design-v15-empty"><Icon icon="iconoir:history"/><b>Henüz geçmiş yok</b><span>Tema değiştirildiğinde veya tasarım kaydedildiğinde otomatik yedek oluşur.</span></div>}</div>
  </>;

  const settingsPanel=<>
    <SidebarSubHeader title={selectedSection?sectionTitle(selectedSection):selected==='theme'?'Tema Ayarları':selected==='header'?'Header':selected==='footer'?'Footer':selected==='menu'?'Menü':selected==='product'?'Ürün Sayfası':selected==='product-card'?'Ürün Kartı':selected==='category'?'Kategori Sayfası':selected==='blog'?'Blog Görünümü':selected==='info'?'Bilgilendirme Sayfası':selected==='topbar'?'Duyuru Barı':'Ayarlar'} subtitle={selectedSection?blockTitle(selectedSection.sectionType):'Canlı önizlemeye anında uygulanır'} onBack={panelBack}/>
    <div className="design-v15-settings-scroll"><SettingsPanel selected={selected} section={selectedSection} design={design} menus={menus} updateMenus={updateMenus} updateDesign={updateDesign} updateSection={(patch:any)=>selectedSection&&updateSection(String(selectedSection.id),{settings:{...(selectedSection.settings||{}),...patch}})} onDelete={()=>selectedSection&&void deleteSection(String(selectedSection.id))}/></div>
  </>;

  return <div className="design-editor-v14 design-editor-v15">
    <div className="design-v14-topbar">
      <div className="design-v14-topbar-left">
        <button type="button" className="design-v14-back" aria-label="Panele dön" onClick={()=>guardNavigate('/dashboard')}><Icon icon="iconoir:arrow-left"/></button>
        <button type="button" className="design-v15-sidebar-toggle" onClick={()=>setSidebarCollapsed(v=>!v)} title={sidebarCollapsed?'Paneli aç':'Paneli daralt'}><Icon icon={sidebarCollapsed?'iconoir:sidebar-expand':'iconoir:sidebar-collapse'}/></button>
        <div className="design-v14-title"><b>Mağaza Tasarımı</b><small>{themeName} · gerçek verilerle canlı önizleme</small></div><label className="design-v14-theme-name" title="Tema adı"><Icon icon="iconoir:edit-pencil"/><input aria-label="Tema adı" value={themeName} onChange={e=>updateDesign('general','themeName',e.target.value)} /></label>
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
          <div className="design-v16-editor-actions">
            <button type="button" className="design-v16-reset" onClick={()=>{if(!window.confirm('Kurulum ayarlarına dönülsün mü? Kaydetmediğiniz mevcut tasarım değişiklikleri silinecek.'))return;const target=themes.find((t:any)=>String(t.id)===editorThemeId)||currentTheme;if(!target)return;const skinSlug=String(editorSkinParam||design?.general?.skinSlug||currentSkinSlug);const source=sourceFor(target,skinSlug);setDesign(source.design);setSections(source.sections);setSelected('');setPanelMode('root');setDirty(true);sendDraft({kind:'design',design:source.design});sendDraft({kind:'sections',sections:source.sections})}}><Icon icon="iconoir:restart"/> Kurulum ayarlarına dön</button>
            <button type="button" className="design-v16-themes" onClick={()=>guardNavigate('/design-content')}><Icon icon="iconoir:shop"/> Temalar</button>
            <button type="button" className="design-v16-save" disabled={saving||!dirty} onClick={()=>void saveAll()}><Icon icon={saving?'iconoir:refresh-double':'iconoir:floppy-disk'} className={saving?'spin':''}/>{saving?'Kaydediliyor…':'Kaydet'}</button>
          </div>
        </div>
      </aside>

      <main className="design-v14-canvas design-v15-canvas">
        <div className={'design-v14-device '+viewport}>
          <div className="design-v14-browserbar"><i/><i/><i/><span>Canlı Önizleme</span><em>{PAGE_OPTIONS.find(x=>x[0]===pageKey)?.[1]} · gerçek mağaza verisi</em></div>
          {previewUrl?<iframe ref={previewRef} title="Canlı Önizleme" sandbox="allow-scripts allow-same-origin allow-forms" src={previewUrl} onLoad={()=>{const frame=previewRef.current?.contentWindow;if(!frame)return;frame.postMessage({source:'commerce-design-editor',action:'draft',kind:'design',design},'*');frame.postMessage({source:'commerce-design-editor',action:'draft',kind:'sections',sections},'*');frame.postMessage({source:'commerce-design-editor',action:'draft',kind:'menus',menus},'*');frame.postMessage({source:'commerce-design-editor',action:'select',target:selected},'*')}}/>:<div className="design-v15-preview-loading">Canlı mağaza hazırlanıyor…</div>}
        </div>
      </main>
    </div>
  </div>;
}
function ThemeThumb({slug,image,index=0}:{slug:string;image?:string;index?:number}){const fallbacks=['https://picsum.photos/seed/ticarti-fashion/900/600','https://picsum.photos/seed/ticarti-home/900/600','https://picsum.photos/seed/ticarti-beauty/900/600','https://picsum.photos/seed/ticarti-tech/900/600','https://picsum.photos/seed/ticarti-style/900/600','https://picsum.photos/seed/ticarti-shop/900/600'];const src=image||fallbacks[index%fallbacks.length];return <div className="design-v16-thumb"><img src={src} alt={slug}/><div className="design-v16-thumb-browser"><i/><i/><i/></div></div>}

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

function SettingsPanel({selected,section,design,menus,updateMenus,updateDesign,updateSection,onDelete}:{selected:string;section:any;design:any;menus:any[];updateMenus:(menus:any[])=>void;updateDesign:(group:string,key:string,value:any)=>void;updateSection:(patch:any)=>void;onDelete:()=>void}){
  if(selected==='theme')return <Panel title="Tema Ayarları" subtitle="Mağazanın genel görünüm dili" icon="iconoir:palette"><ThemeSettings design={design} update={updateDesign}/></Panel>;
  if(selected==='topbar')return <Panel title="Duyuru Barı" subtitle="Tüm sayfaların üstünde" icon="iconoir:megaphone"><Switch label="Duyuru barını göster" checked={!!design?.header?.topbarEnabled} onChange={v=>updateDesign('header','topbarEnabled',v)}/><Field label="Metin" value={design?.header?.topbarText||''} onChange={v=>updateDesign('header','topbarText',v)} placeholder="750 TL üzeri ücretsiz kargo"/><Field label="Link" value={design?.header?.topbarLink||''} onChange={v=>updateDesign('header','topbarLink',v)} placeholder="/kampanya"/></Panel>;
  if(selected==='header')return <Panel title="Header" subtitle="Logo, duyuru, araçlar ve davranış" icon="iconoir:panel-top">
    <TemplateMini count={8} value={num(design?.header?.template,1)} label="Header" onChange={v=>updateDesign('header','template',v)}/>
    <SectionHead text="Logo & görünüm"/>
    <Field label="Logo URL" value={design?.header?.logoUrl||''} onChange={v=>updateDesign('header','logoUrl',v)} placeholder="https://..."/>
    <div className="design-v14-two"><NumberField label="Logo genişliği" value={design?.header?.logoWidth??130} min={40} max={320} suffix="px" onChange={v=>updateDesign('header','logoWidth',v)}/><label className="design-v14-field"><span>Menü hizası</span><select value={design?.header?.menuAlign||'center'} onChange={e=>updateDesign('header','menuAlign',e.target.value)}><option value="left">Sol</option><option value="center">Orta</option><option value="right">Sağ</option></select></label></div>
    <SectionHead text="Davranış"/>
    <Switch label="Sticky header" checked={design?.header?.sticky!==false} onChange={v=>updateDesign('header','sticky',v)}/>
    <Switch label="Arama göster" checked={design?.header?.showSearch!==false} onChange={v=>updateDesign('header','showSearch',v)}/>
    <Switch label="Hesap ikonu" checked={design?.header?.showAccount!==false} onChange={v=>updateDesign('header','showAccount',v)}/>
    <Switch label="Favoriler ikonu" checked={design?.header?.showWishlist!==false} onChange={v=>updateDesign('header','showWishlist',v)}/>
    <Switch label="Sepet ikonu" checked={design?.header?.showCart!==false} onChange={v=>updateDesign('header','showCart',v)}/>
    <SectionHead text="Duyuru Barı"/>
    <Switch label="Duyuru barını göster" checked={!!design?.header?.topbarEnabled} onChange={v=>updateDesign('header','topbarEnabled',v)}/>
    <Field label="Metin" value={design?.header?.topbarText||''} onChange={v=>updateDesign('header','topbarText',v)} placeholder="Duyuru metni"/>
    <Field label="Link" value={design?.header?.topbarLink||''} onChange={v=>updateDesign('header','topbarLink',v)} placeholder="/kampanya"/>
  </Panel>;
  if(selected==='menu')return <Panel title="Menü" subtitle="Ana menü, mega menü, mobil ve footer menüsü" icon="iconoir:menu-scale"><MenuSettings menus={menus} update={updateMenus}/></Panel>;
  if(selected==='footer')return <Panel title="Footer" subtitle="Bülten, kolonlar ve alt alan" icon="iconoir:panel-bottom">
    <TemplateMini count={5} value={num(design?.footer?.template,1)} label="Footer" onChange={v=>updateDesign('footer','template',v)}/>
    <SectionHead text="Bülten"/>
    <Switch label="Bülten alanını göster" checked={design?.footer?.newsletterEnabled!==false} onChange={v=>updateDesign('footer','newsletterEnabled',v)}/>
    <Field label="Bülten üst başlığı" value={design?.footer?.newsletterSubtitle||''} onChange={v=>updateDesign('footer','newsletterSubtitle',v)} placeholder="Newsletter"/>
    <Field label="Bülten başlığı" value={design?.footer?.newsletterTitle||''} onChange={v=>updateDesign('footer','newsletterTitle',v)} placeholder="Bültene katıl"/>
    <ColorField label="Footer arka plan" value={design?.footer?.backgroundColor||'#ffffff'} onChange={v=>updateDesign('footer','backgroundColor',v)}/>
    <SectionHead text="Alt alan"/>
    <Field label="Copyright" value={design?.footer?.copyright||''} onChange={v=>updateDesign('footer','copyright',v)} placeholder="© {{year}} {{store_name}}"/>
    <Area label="Footer üstü HTML" value={design?.footer?.upperHtml||''} onChange={v=>updateDesign('footer','upperHtml',v)} rows={5}/>
  </Panel>;
  if(selected==='product'||selected==='product-card'||selected==='category')return <Panel title={selected==='category'?'Kategori Tasarımı':selected==='product-card'?'Ürün Kartı':'Ürün Sayfası'} subtitle="Şablon ve grid görünümü" icon="iconoir:box-iso"><ProductPanel selected={selected} design={design} update={updateDesign}/></Panel>;
  if(selected==='blog')return <Panel title="Blog Görünümü" subtitle="Global tema ayarlarını kullanır" icon="iconoir:book"><div className="design-v14-help">Blog liste ve detay sayfası seçtiğiniz renk, tipografi, header ve footer ayarlarını otomatik kullanır. İçerikleri Blog menüsünden yönetebilirsiniz.</div><button type="button" className="btn btn-outline-primary w-100" onClick={()=>window.location.href='/blog/posts'}>Blog Yazılarına Git</button></Panel>;
  if(selected==='info')return <Panel title="Bilgilendirme Sayfaları" subtitle="Sayfalar modülü ile içerik" icon="iconoir:page"><div className="design-v14-help">Kurumsal ve sözleşme sayfaları bu tema ayarlarını kullanır. Sayfa içeriği, SEO ve dile göre slug alanları Sayfalar bölümünden yönetilir.</div><button type="button" className="btn btn-outline-primary w-100" onClick={()=>window.location.href='/pages'}>Sayfalara Git</button></Panel>;
  if(section)return <Panel title={sectionTitle(section)} subtitle={blockTitle(section.sectionType)} icon={blockIcon(section.sectionType)}><SectionSettings section={section} update={updateSection}/><button type="button" className="btn btn-outline-danger w-100 mt-3" onClick={onDelete}><Icon icon="iconoir:trash" className="me-1"/>Bölümü Sil</button></Panel>;
  return <div className="design-v14-empty-settings"><Icon icon="iconoir:cursor-pointer"/><b>Düzenlemek için bir alan seçin</b><span>Sol taraftaki bölüm veya global alanlardan birine tıklayın.</span></div>;
}

function MenuSettings({menus,update}:{menus:any[];update:(menus:any[])=>void}){
  const[firstHandle]=useState(()=>String(menus?.[0]?.handle||'header-main'));
  const[handle,setHandle]=useState(firstHandle);
  const activeMenu=menus.find((m:any)=>String(m.handle)===handle)||{handle,name:MENU_LOCATIONS.find(x=>x[0]===handle)?.[1]||'Menü',items:[]};
  const items=normalizeMenuItems(activeMenu.items);
  const[activeId,setActiveId]=useState('');
  function commit(nextItems:MenuItem[],patch:any={}){
    const exists=menus.some((m:any)=>String(m.handle)===handle);
    const row={...activeMenu,...patch,handle,items:nextItems};
    update(exists?menus.map((m:any)=>String(m.handle)===handle?row:m):[...menus,row]);
  }
  function choose(next:string){setHandle(next);setActiveId('')}
  function patchItem(id:string,key:string,value:any){commit(menuWalk(items,id,row=>({...row,[key]:value})))}
  function removeItem(id:string){commit(menuRemove(items,id));if(activeId===id)setActiveId('')}
  function addChild(id:string){commit(menuWalk(items,id,row=>({...row,children:[...(row.children||[]),emptyMenuItem()]})))}
  const active=menuFind(items,activeId);
  return <div className="design-v16-menu-editor">
    <label className="design-v14-field"><span>Menü konumu</span><select value={handle} onChange={e=>choose(e.target.value)}>{MENU_LOCATIONS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <Field label="Menü adı" value={activeMenu.name||''} onChange={v=>commit(items,{name:v})}/>
    <SectionHead text="Menü yapısı"/>
    <div className="design-v16-menu-tree">{items.map(item=><MenuEditorRow key={item.id} item={item} depth={0} activeId={activeId} onSelect={setActiveId} onAdd={addChild} onRemove={removeItem}/>)}</div>
    <button type="button" className="design-v14-add-row" onClick={()=>commit([...items,emptyMenuItem()])}><Icon icon="iconoir:plus"/> Üst Menü Ekle</button>
    {active&&<><SectionHead text="Seçili öğe"/><Field label="Başlık" value={active.label} onChange={v=>patchItem(active.id,'label',v)}/><Field label="Bağlantı" value={active.url} onChange={v=>patchItem(active.id,'url',v)} placeholder="/collections/yeni"/><label className="design-v14-field"><span>Tür</span><select value={active.type} onChange={e=>patchItem(active.id,'type',e.target.value)}><option value="link">Bağlantı</option><option value="mega">Mega Menü</option><option value="category">Kategori</option><option value="collection">Koleksiyon</option><option value="promo">Görsel Promosyon</option></select></label><Field label="Rozet" value={active.badge||''} onChange={v=>patchItem(active.id,'badge',v)} placeholder="YENİ"/><Field label="Görsel URL" value={active.imageUrl||''} onChange={v=>patchItem(active.id,'imageUrl',v)} placeholder="https://..."/><Field label="Kısa açıklama" value={active.description||''} onChange={v=>patchItem(active.id,'description',v)}/></>}
  </div>
}
function MenuEditorRow({item,depth,activeId,onSelect,onAdd,onRemove}:{item:MenuItem;depth:number;activeId:string;onSelect:(id:string)=>void;onAdd:(id:string)=>void;onRemove:(id:string)=>void}){
  return <div className="design-v16-menu-node" style={{marginLeft:depth*12}}><div className={activeId===item.id?'active':''}><button type="button" onClick={()=>onSelect(item.id)}><Icon icon={item.type==='mega'?'iconoir:view-columns-3':'iconoir:nav-arrow-right'}/><span>{item.label}</span></button><button type="button" title="Alt öğe ekle" onClick={()=>onAdd(item.id)}><Icon icon="iconoir:plus"/></button><button type="button" title="Sil" onClick={()=>onRemove(item.id)}><Icon icon="iconoir:trash"/></button></div>{(item.children||[]).map(child=><MenuEditorRow key={child.id} item={child} depth={depth+1} activeId={activeId} onSelect={onSelect} onAdd={onAdd} onRemove={onRemove}/>)}</div>
}

function Panel({title,subtitle,icon,children}:{title:string;subtitle:string;icon:string;children:React.ReactNode}){return <div className="design-v14-panel"><div className="design-v14-panel-head"><span><Icon icon={icon}/></span><div><b>{title}</b><small>{subtitle}</small></div></div><div className="design-v14-panel-body">{children}</div></div>}

function ThemeSettings({design,update}:{design:any;update:(group:string,key:string,value:any)=>void}){const g=design?.general||{};return <>
  <SectionHead text="Tipografi"/>
  <label className="design-v14-field"><span>Metin yazı tipi</span><select value={g.bodyFont||FONT_OPTIONS[0][0]} onChange={e=>update('general','bodyFont',e.target.value)}>{FONT_OPTIONS.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
  <label className="design-v14-field"><span>Başlık yazı tipi</span><select value={g.headingFont||FONT_OPTIONS[0][0]} onChange={e=>update('general','headingFont',e.target.value)}>{FONT_OPTIONS.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
  <div className="design-v14-two"><NumberField label="Temel font" value={g.baseFontSize??16} min={10} max={28} suffix="px" onChange={v=>update('general','baseFontSize',v)}/><NumberField label="Başlık ölçeği" value={g.headingScale??100} min={70} max={160} suffix="%" onChange={v=>update('general','headingScale',v)}/></div>
  <div className="design-v14-three"><NumberField label="H1" value={g.h1Size} min={24} max={96} onChange={v=>update('general','h1Size',v)}/><NumberField label="H2" value={g.h2Size} min={20} max={72} onChange={v=>update('general','h2Size',v)}/><NumberField label="H3" value={g.h3Size} min={16} max={56} onChange={v=>update('general','h3Size',v)}/></div>
  <SectionHead text="Renkler"/>
  <div className="design-v14-colors">{[['primaryColor','Ana'],['secondaryColor','İkincil'],['textColor','Metin'],['backgroundColor','Arka Plan'],['surfaceColor','Yüzey'],['borderColor','Border']].map(([key,label])=><ColorField key={key} label={label} value={g[key]} onChange={v=>update('general',key,v)}/>)}</div>
  <SectionHead text="Yerleşim"/>
  <NumberField label="Site genişliği" value={g.containerWidth} min={760} max={1800} suffix="px" onChange={v=>update('general','containerWidth',v)}/><div className="design-v14-two"><NumberField label="Yatay sayfa boşluğu" value={g.pagePadding??20} min={0} max={80} suffix="px" onChange={v=>update('general','pagePadding',v)}/><NumberField label="Grid boşluğu" value={g.gridSpacing??20} min={0} max={80} suffix="px" onChange={v=>update('general','gridSpacing',v)}/></div><NumberField label="Bölüm aralığı" value={g.sectionSpacing} min={16} max={160} suffix="px" onChange={v=>update('general','sectionSpacing',v)}/><div className="design-v14-two"><NumberField label="Kart köşesi" value={g.borderRadius} min={0} max={40} suffix="px" onChange={v=>update('general','borderRadius',v)}/><NumberField label="Buton köşesi" value={g.buttonRadius} min={0} max={40} suffix="px" onChange={v=>update('general','buttonRadius',v)}/></div><div className="design-v14-two"><NumberField label="Input köşesi" value={g.inputRadius??20} min={0} max={40} suffix="px" onChange={v=>update('general','inputRadius',v)}/><NumberField label="Badge köşesi" value={g.badgeRadius??20} min={0} max={40} suffix="px" onChange={v=>update('general','badgeRadius',v)}/></div><Area label="Özel CSS" value={g.customCss||''} onChange={v=>update('general','customCss',v)} rows={6}/>
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
