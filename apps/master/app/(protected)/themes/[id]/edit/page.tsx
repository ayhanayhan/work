'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import {use,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ChevronLeft,ExternalLink,LoaderCircle,Monitor,Plus,Copy,ArrowUp,ArrowDown,RotateCcw,Save,Smartphone,Tablet,Trash2} from 'lucide-react';
import {useAdminSession} from '@/app/components/AdminSession';
import {MediaLibraryDialog} from '@/app/(protected)/components/media-library-dialog';
import {Button} from '@/components/ui/button';
import {useTranslation} from 'react-i18next';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
type Viewport='desktop'|'tablet'|'mobile';
import {arr,obj,clone,uid,schemaSettings,defaults,blockDefaults,sectionMap,sectionOrder,reorderId,duplicateSectionState,schemaText,hiddenThemeGroup,hiddenThemeSetting,type Selection,type ThemeFieldResources} from './editor-model';
import {SettingsPanel} from './settings-fields';
import {readThemeSettingsSchema, type ThemeSettingGroup} from './theme-schema-contract';
import {SectionList} from './section-list';
import {EditorSidebarHome,EditorSettingsNavigation} from './editor-sidebar';
import {EditorGlobalSections} from './editor-global-sections';
import {availablePageSections, isFaqSection} from './editor-page-modules';

export default function ThemeEditorPage({params}:{params:Promise<{id:string}>}){
  const{id}=use(params);const router=useRouter();const{t}=useTranslation();const{session,stores}=useAdminSession();
  const[siteResources,setSiteResources]=useState<any>({siteLogoUrl:'',socialAccounts:[]});const[mediaPicker,setMediaPicker]=useState<any>({open:false,cb:null,title:''});
  const[meta,setMeta]=useState<any>(null),[settings,setSettings]=useState<any>({}),[templates,setTemplates]=useState<any>({}),[groups,setGroups]=useState<any>({});
  const[saved,setSaved]=useState<any>(null),[selection,setSelection]=useState<Selection>(null),[settingsGroup,setSettingsGroup]=useState(-1),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[viewport,setViewport]=useState<Viewport>('desktop'),[previewKey,setPreviewKey]=useState(0),[addOpen,setAddOpen]=useState(false),[blockAddOpen,setBlockAddOpen]=useState(false);
  const iframeRef=useRef<HTMLIFrameElement|null>(null);
  const [templateKey,setTemplateKey]=useState('index');
  const [previewPath,setPreviewPath]=useState('/');
  const membership=useMemo(()=>stores.find(x=>x.tenantId===session?.tenantId)||stores[0],[stores,session?.tenantId]);
  const storeUrl=useMemo(()=>{const d=String(membership?.site?.domain||'').trim().replace(/^https?:\/\//,'').replace(/\/$/,'');if(d)return`https://${d}`;const slug=String(membership?.site?.publicSlug||membership?.site?.slug||'').trim();return slug?`https://${slug}.ticarti.com`:''},[membership]);
  const previewToken=String(meta?.previewToken||'');const previewUrl=storeUrl?`${storeUrl}${previewPath.startsWith('/')?previewPath:'/'+previewPath}${(previewPath.includes('?')?'&':'?')}ticarti_design=1&theme=${encodeURIComponent(id)}&previewToken=${encodeURIComponent(previewToken)}&preview=${previewKey}`:'';
  const headers=useCallback((json=false)=>({...json?{'content-type':'application/json'}:{},authorization:`Bearer ${session?.accessToken||''}`,'x-tenant-id':session?.tenantId||''}),[session?.accessToken,session?.tenantId]);
  const schemaList=useMemo(()=>{const map=new Map<string,any>();for(const row of [...arr(meta?.sectionSchemas),...arr(meta?.modules)]){const type=String(row?.type||'');if(type&&!map.has(type))map.set(type,row)}return[...map.values()]},[meta]);
  const schemaMap=useMemo(()=>new Map(schemaList.map((x:any)=>[String(x.type),x])),[schemaList]);
  const addable=useMemo(()=>availablePageSections(schemaList),[schemaList]);
  /* TICARTI_TEMPLATE_PAGE_EDITOR_V1 — edit the chosen native JSON template, not only index. */
  const templateNames=useMemo(()=>Array.from(new Set(['index',...Object.keys(obj(templates))])).filter(k=>Object.keys(obj(templates[k])).length>0),[templates]);
  const home=obj(templates?.[templateKey]);const header=obj(groups?.header),footer=obj(groups?.footer);
  const templateTitle=(key:string)=>({index:'Anasayfa',product:'Ürün sayfası',collection:'Kategori sayfası',cart:'Sepet',search:'Arama',page:'İçerik sayfası','list-collections':'Kategoriler'} as Record<string,string>)[key]||key;
  const selectTemplate=(key:string)=>{setTemplateKey(key);setSelection({area:'template'});setAddOpen(false);setBlockAddOpen(false);setPreviewPath(key==='index'?'/':key==='collection'?'/collections/all':key==='search'?'/search':key==='cart'?'/cart':'/');};

  const load=useCallback(async()=>{if(!session?.storeId)return;setLoading(true);setMessage('');try{
    const r=await fetch(`${API}/admin/themes/${encodeURIComponent(id)}/draft?storeId=${encodeURIComponent(session.storeId)}`,{credentials:'include',headers:headers()});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.message||'Tema paketi okunamadı.');
    setMeta(j);setSettings(clone(j.settingsCurrent||{}));setTemplates(clone(j.templates||{}));setGroups(clone(j.groups||{}));
    setSaved(clone({settings:j.settingsCurrent||{},templates:j.templates||{},groups:j.groups||{}}));
  }catch(e:any){setMessage(e?.message||'Tema yüklenemedi.')}finally{setLoading(false)}},[headers,id,session?.storeId]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{if(!session?.storeId)return;fetch(`${API}/admin/store-settings/${encodeURIComponent(session.storeId)}`,{credentials:'include',headers:headers()}).then(r=>r.ok?r.json():null).then(j=>{if(!j)return;const s=j?.settings&&typeof j.settings==='object'?j.settings:{};setSiteResources({siteLogoUrl:String(j?.logoUrl||''),socialAccounts:Array.isArray(s.socialAccounts)?s.socialAccounts:[]})}).catch(()=>{})},[headers,session?.storeId]);
  const fieldResources:ThemeFieldResources={siteLogoUrl:siteResources.siteLogoUrl||'',socialAccounts:siteResources.socialAccounts||[],openMedia:(cb,title)=>setMediaPicker({open:true,cb,title:title||'Medya seç'})};

  const sendPreview=useCallback(()=>{const f=iframeRef.current?.contentWindow;if(!f||!storeUrl)return;try{f.postMessage({source:'commerce-design-editor',action:'draft',kind:'runtime',runtime:{themeId:id,settingsCurrent:settings,templates,groups}},new URL(storeUrl).origin)}catch{}},[settings,templates,groups,storeUrl]);
  useEffect(()=>{const t=setTimeout(sendPreview,100);return()=>clearTimeout(t)},[sendPreview]);

  const areaState=(area:'header'|'template'|'footer')=>area==='header'?obj(groups.header):area==='footer'?obj(groups.footer):obj(templates[templateKey]);
  const writeArea=(area:'header'|'template'|'footer',next:any)=>{if(area==='header')setGroups((p:any)=>({...p,header:next}));else if(area==='footer')setGroups((p:any)=>({...p,footer:next}));else setTemplates((p:any)=>({...p,[templateKey]:next}))};
  const mutateSection=(area:'header'|'template'|'footer',id:string,fn:(row:any)=>any)=>{const state=areaState(area),sections={...sectionMap(state)};sections[id]=fn(clone(sections[id]||{}));writeArea(area,{...state,sections})};
  const move=(area:'header'|'template'|'footer',id:string,delta:number)=>{const state=areaState(area),order=sectionOrder(state),i=order.indexOf(id);if(i<0)return;const j=Math.max(0,Math.min(order.length-1,i+delta));if(i===j)return;order.splice(j,0,order.splice(i,1)[0]);writeArea(area,{...state,order})};
  const duplicateSection=(area:'header'|'template'|'footer',sectionId:string)=>{
    if(area!=='template')return;
    const state=areaState(area);
    const source=sectionMap(state)[sectionId];if(!source)return;
    const newId=uid(String(source.type||'section').replace(/[^a-z0-9_-]/gi,'section'));
    writeArea(area,duplicateSectionState(state,sectionId,newId,()=>uid('block')));
    setSelection({area,id:newId});
  };
  const drag=(area:'header'|'template'|'footer',from:string,to:string)=>{const state=areaState(area),order=sectionOrder(state),a=order.indexOf(from),b=order.indexOf(to);if(a<0||b<0)return;order.splice(b,0,order.splice(a,1)[0]);writeArea(area,{...state,order})};
  const toggle=(area:'header'|'template'|'footer',id:string)=>mutateSection(area,id,row=>({...row,disabled:!row.disabled}));
  const remove=(area:'header'|'template'|'footer',id:string)=>{const state=areaState(area),sections={...sectionMap(state)};delete sections[id];const order=sectionOrder(state).filter(x=>x!==id);writeArea(area,{...state,sections,order});setSelection({area:'template'})};

  const createSection=(type:string)=>{const def=schemaMap.get(type);if(!def)return;const schema=def.schema||{},preset=arr(schema.presets)[0]||{},id=uid(type.replace(/[^a-z0-9_-]/gi,'section'));const blocks:any={},block_order:string[]=[];
    for(const b of arr(preset.blocks)){const bid=uid(String(b?.type||'block'));blocks[bid]={type:String(b?.type||'item'),settings:{...blockDefaults(arr(schema.blocks).find((x:any)=>String(x.type)===String(b?.type))),...obj(b?.settings)}};block_order.push(bid)}
    const state=areaState('template'),sections={...sectionMap(state),[id]:{type,settings:{...defaults(schema),...obj(preset.settings)},blocks,block_order}},order=[...sectionOrder(state),id];writeArea('template',{...state,sections,order});setSelection({area:'template'});setAddOpen(false);
  };

  const selectedRow=useMemo(()=>{if(!selection?.id||selection.area==='settings')return null;return sectionMap(areaState(selection.area as any))[selection.id]||null},[selection,groups,templates]);
  const selectedSchema=selectedRow?schemaMap.get(String(selectedRow.type||''))?.schema||{}:{};
  const updateSelectedSettings=(key:string,value:any)=>{if(!selection?.id||selection.area==='settings')return;mutateSection(selection.area as any,selection.id,row=>({...row,settings:{...obj(row.settings),[key]:value}}))};
  const updateBlockSettings=(bid:string,key:string,value:any)=>{if(!selection?.id||selection.area==='settings')return;mutateSection(selection.area as any,selection.id,row=>({...row,blocks:{...obj(row.blocks),[bid]:{...obj(row.blocks?.[bid]),settings:{...obj(row.blocks?.[bid]?.settings),[key]:value}}}}))};
  const addBlock=(type:string)=>{if(!selection?.id||selection.area==='settings')return;const bs=arr(selectedSchema?.blocks).find((x:any)=>String(x.type)===type);if(!bs)return;mutateSection(selection.area as any,selection.id,row=>{const bid=uid(type);return{...row,blocks:{...obj(row.blocks),[bid]:{type,settings:blockDefaults(bs)}},block_order:[...arr(row.block_order),bid]}});setBlockAddOpen(false)};
  const moveBlock=(bid:string,delta:number)=>{if(!selection?.id||selection.area==='settings')return;
    mutateSection(selection.area as any,selection.id,row=>({...row,block_order:reorderId(arr(row.block_order).map(String),bid,delta)}));
  };
  const duplicateBlock=(bid:string)=>{if(!selection?.id||selection.area==='settings')return;
    mutateSection(selection.area as any,selection.id,row=>{
      const source=obj(row.blocks)[bid];if(!source)return row;
      const fresh=uid('block');const order=arr(row.block_order).map(String),index=order.indexOf(bid);
      order.splice(index<0?order.length:index+1,0,fresh);
      return {...row,blocks:{...obj(row.blocks),[fresh]:clone(source)},block_order:order};
    });
  };
  const deleteBlock=(bid:string)=>{if(!selection?.id||selection.area==='settings')return;mutateSection(selection.area as any,selection.id,row=>{const blocks={...obj(row.blocks)};delete blocks[bid];return{...row,blocks,block_order:arr(row.block_order).filter((x:any)=>String(x)!==bid)}})};

  const applyDraft=(j:any)=>{setMeta(j);setSettings(clone(j.settingsCurrent||{}));setTemplates(clone(j.templates||{}));setGroups(clone(j.groups||{}));setSaved(clone({settings:j.settingsCurrent||{},templates:j.templates||{},groups:j.groups||{}}));setSelection(null);setSettingsGroup(-1);setAddOpen(false);setBlockAddOpen(false)};
  const reloadDraft=async()=>{if(!session?.storeId)return null;const r=await fetch(`${API}/admin/themes/${encodeURIComponent(id)}/draft?storeId=${encodeURIComponent(session.storeId)}`,{credentials:'include',headers:headers()});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.message||'Tema paketi okunamadı.');applyDraft(j);return j};
  const reset=async()=>{if(!session?.storeId||!meta)return;setSaving(true);setMessage('');try{
    if(meta?.active){const r=await fetch(`${API}/admin/themes/${encodeURIComponent(id)}/activate`,{method:'POST',credentials:'include',headers:headers(true),body:JSON.stringify({storeId:session.storeId})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.message||'Tema sıfırlanamadı.')}
    await reloadDraft();setMessage(meta?.active?'Tema varsayılan ayarlara sıfırlandı ve canlı site güncellendi.':'Tema varsayılan ayarlara döndürüldü.');setPreviewKey(x=>x+1);
  }catch(e:any){setMessage(e?.message||'Tema sıfırlanamadı.')}finally{setSaving(false)}};
  const saveDraft=async()=>{if(!session?.storeId||!meta)return;setSaving(true);setMessage('');try{
    const body={storeId:session.storeId,settingsCurrent:settings,templates,groups};
    const r=await fetch(`${API}/admin/themes/${encodeURIComponent(id)}/draft`,{method:'POST',credentials:'include',headers:headers(true),body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.message||'Taslak kaydedilemedi.');
    setMeta((p:any)=>({...p,hasSavedDraft:true}));setSaved(clone({settings,templates,groups}));setMessage('Taslak kaydedildi. Canlı mağaza değiştirilmedi.');
  }catch(e:any){setMessage(e?.message||'Taslak kaydedilemedi.')}finally{setSaving(false)}};
  const save=async()=>{if(!session?.storeId||!meta)return;setSaving(true);setMessage('');try{
    const body={storeId:session.storeId,design:meta.design||{},sections:meta.sections||[],menus:meta.menus||[],settingsCurrent:settings,templates,groups};
    const r=await fetch(`${API}/admin/themes/${encodeURIComponent(id)}/activate`,{method:'POST',credentials:'include',headers:headers(true),body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j?.message||'Tema kaydedilemedi.');setMeta((p:any)=>({...p,active:true,source:'tenant',hasSavedDraft:false,theme:{...(p?.theme||{}),current:true}}));setSaved(clone({settings,templates,groups}));const pb=j?.performanceBudget;setMessage(pb?`Tema kaydedildi ve canlı mağazaya uygulandı. Performans bütçesi: ${Math.round(Number(pb.serializedBytes||0)/1024)} KB · ${Number(pb.nodeCount||0)} düğüm · ${Number(pb.externalAssets||0)} harici asset.`:'Tema kaydedildi ve canlı mağazaya uygulandı.');setPreviewKey(x=>x+1);
  }catch(e:any){setMessage(e?.message||'Tema kaydedilemedi.')}finally{setSaving(false)}};

  const hasUnsavedChanges=!!saved&&JSON.stringify({settings,templates,groups})!==JSON.stringify(saved);
  const width=viewport==='mobile'?'390px':viewport==='tablet'?'820px':'100%';
  const globalGroups=readThemeSettingsSchema(meta?.settingsSchema).groups.filter((g:any)=>!hiddenThemeGroup(g)&&arr(g?.settings).some((row:any)=>row?.id&&!hiddenThemeSetting(row)));
  const activeSettingsGroup: ThemeSettingGroup = settingsGroup>=0 ? (globalGroups[Math.min(settingsGroup,Math.max(0,globalGroups.length-1))] ?? {name:'',settings:[]}) : {name:'',settings:[]};

  return <><div className="fixed inset-0 z-[9999] flex h-dvh w-screen flex-col overflow-hidden bg-background">
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4">
      <div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" onClick={()=>router.back()}><ArrowLeft/></Button><div><h1 className="font-semibold">{meta?.theme?.name||'Tema Düzenleyici'}</h1><p className="text-xs text-muted-foreground">{hasUnsavedChanges?'Kaydedilmemiş değişiklikler':meta?.hasSavedDraft?'Kaydedilmiş taslak':'Tema düzenleyici'}</p></div></div>
      <div className="flex items-center gap-2"><div className="hidden rounded-lg border p-1 sm:flex"><Button size="icon" variant={viewport==='desktop'?'secondary':'ghost'} onClick={()=>setViewport('desktop')}><Monitor/></Button><Button size="icon" variant={viewport==='tablet'?'secondary':'ghost'} onClick={()=>setViewport('tablet')}><Tablet/></Button><Button size="icon" variant={viewport==='mobile'?'secondary':'ghost'} onClick={()=>setViewport('mobile')}><Smartphone/></Button></div><Button variant="outline" onClick={reset}><RotateCcw/>Sıfırla</Button>{storeUrl&&<Button variant="outline" size="icon" asChild><a href={storeUrl} target="_blank" rel="noreferrer"><ExternalLink/></a></Button>}<Button variant="outline" onClick={()=>void saveDraft()} disabled={saving||loading||!hasUnsavedChanges}>{saving?<LoaderCircle className="animate-spin"/>:<Save/>}Taslağı Kaydet</Button><Button onClick={()=>void save()} disabled={saving||loading}>{saving?<LoaderCircle className="animate-spin"/>:<Save/>}Yayınla</Button></div>
    </header>
    {message&&<div className="border-b bg-muted/40 px-4 py-2 text-sm">{message}</div>}
    <div className="grid min-h-0 grow grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
      <aside className="min-h-0 overflow-auto border-r bg-background">
        {loading?<div className="grid min-h-56 place-items-center"><LoaderCircle className="animate-spin"/></div>
        :addOpen?<div className="grid gap-3 p-4"><div className="flex items-center gap-2"><Button variant="ghost" size="icon" onClick={()=>setAddOpen(false)}><ChevronLeft/></Button><div><div className="font-semibold">{String(t('themeEditor.addSection',{defaultValue:'Bölüm ekle'}))}</div><div className="text-xs text-muted-foreground">{addable.length} tema modülü</div></div></div><div className="grid gap-2">{addable.some((item:any)=>isFaqSection(item))&&<p className="text-xs font-medium text-muted-foreground">FAQ ve diğer modüller bu sayfa şablonuna eklenebilir.</p>}{addable.map((x:any)=><button key={String(x.type)} type="button" onClick={()=>createSection(String(x.type))} className="rounded-lg border p-3 text-left hover:bg-muted/40"><div className="flex items-center justify-between gap-2"><div className="text-sm font-medium">{schemaText(t,x?.schema?.name,x.type)}</div>{isFaqSection(x)&&<span className="rounded border px-2 py-0.5 text-[10px] font-medium">FAQ</span>}</div><div className="mt-1 text-xs text-muted-foreground">{x.type}</div></button>)}</div></div>
        :blockAddOpen&&selection?.id?<div className="grid gap-3 p-4"><div className="flex items-center gap-2"><Button variant="ghost" size="icon" onClick={()=>setBlockAddOpen(false)}><ChevronLeft/></Button><div><div className="font-semibold">{String(t('themeEditor.addBlock',{defaultValue:'Blok ekle'}))}</div><div className="text-xs text-muted-foreground">{schemaText(t,selectedSchema?.name,String(selectedRow?.type||''))}</div></div></div><div className="grid gap-2">{arr(selectedSchema?.blocks).map((b:any)=><button key={String(b.type)} onClick={()=>addBlock(String(b.type))} className="rounded-lg border p-3 text-left hover:bg-muted/40"><div className="text-sm font-medium">{schemaText(t,b.name,b.type)}</div><div className="mt-1 text-xs text-muted-foreground">{b.type}</div></button>)}</div></div>
        :selection?.id&&selection.area!=='settings'?<div className="grid gap-4 p-4">
          <div className="flex items-center gap-2"><Button variant="ghost" size="icon" onClick={()=>setSelection({area:selection.area==='header'||selection.area==='footer'?selection.area:'template'})}><ChevronLeft/></Button><div><div className="font-semibold">{schemaText(t,selectedSchema?.name,String(selectedRow?.type||''))}</div><div className="text-xs text-muted-foreground">{selectedRow?.type}</div></div></div>
          <SettingsPanel rows={schemaSettings(selectedSchema)} valueOf={(row:any)=>row.id&&obj(selectedRow?.settings)[row.id]!==undefined?obj(selectedRow?.settings)[row.id]:row.default} onChange={(row:any,v:any)=>row.id&&updateSelectedSettings(String(row.id),v)} resources={fieldResources}/>
          {arr(selectedSchema?.blocks).length>0&&<div className="grid gap-3 border-t pt-4"><div className="flex items-center justify-between"><div className="font-semibold">{String(t('themeEditor.blocks',{defaultValue:'Bloklar'}))}</div><Button size="sm" variant="outline" onClick={()=>setBlockAddOpen(true)}><Plus className="size-4"/>Blok ekle</Button></div>{arr(selectedRow?.block_order).map((bid:any)=>{const b=obj(selectedRow?.blocks)[String(bid)]||{},bs=arr(selectedSchema.blocks).find((x:any)=>String(x.type)===String(b.type))||{};return <details key={String(bid)} className="rounded-lg border p-3"><summary className="cursor-pointer font-medium">{schemaText(t,bs.name,String(b.type||bid))}</summary><div className="mt-3"><SettingsPanel rows={schemaSettings(bs)} valueOf={(row:any)=>row.id&&obj(b.settings)[row.id]!==undefined?obj(b.settings)[row.id]:row.default} onChange={(row:any,v:any)=>row.id&&updateBlockSettings(String(bid),String(row.id),v)} resources={fieldResources}/></div><div className="mt-3 flex flex-wrap items-center gap-1"><Button size="sm" variant="ghost" disabled={arr(selectedRow?.block_order).indexOf(bid)===0} onClick={()=>moveBlock(String(bid),-1)}><ArrowUp className="size-4"/>Yukarı</Button><Button size="sm" variant="ghost" disabled={arr(selectedRow?.block_order).indexOf(bid)===arr(selectedRow?.block_order).length-1} onClick={()=>moveBlock(String(bid),1)}><ArrowDown className="size-4"/>Aşağı</Button><Button size="sm" variant="ghost" onClick={()=>duplicateBlock(String(bid))}><Copy className="size-4"/>Çoğalt</Button></div><Button variant="ghost" className="mt-3 text-destructive" onClick={()=>deleteBlock(String(bid))}><Trash2 className="size-4"/>{String(t('themeEditor.deleteBlock',{defaultValue:'Bloğu sil'}))}</Button></details>})}</div>}
        </div>
        :selection?.area==='settings'&&settingsGroup>=0?<div className="grid gap-4 p-4"><div className="flex items-center gap-2"><Button variant="ghost" size="icon" onClick={()=>setSettingsGroup(-1)}><ChevronLeft/></Button><div><div className="font-semibold">{schemaText(t,activeSettingsGroup?.name,String(t('themeEditor.themeSettings',{defaultValue:'Theme settings'})))}</div><div className="text-xs text-muted-foreground">{String(t('themeEditor.themeSettings',{defaultValue:'Tema ayarları'}))}</div></div></div><SettingsPanel rows={arr(activeSettingsGroup.settings)} valueOf={(row:any)=>row.id&&settings[row.id]!==undefined?settings[row.id]:row.default} onChange={(row:any,v:any)=>row.id&&setSettings((p:any)=>({...p,[row.id]:v}))} resources={fieldResources}/></div>
        :selection?.area==='settings'?<EditorSettingsNavigation groups={globalGroups} onBack={()=>setSelection(null)} onSelect={setSettingsGroup} />
        :(selection?.area==='header'||selection?.area==='footer')?<EditorGlobalSections activeArea={selection.area} onBack={()=>setSelection(null)} onSwitch={area=>setSelection({area})} header={header} footer={footer} schemas={schemaMap} selection={selection} setSelection={setSelection} onMove={move} onToggle={toggle} onDelete={remove} onDuplicate={duplicateSection} onDrag={drag}/>
        :selection?.area==='template'?<div className="grid gap-5 p-4"><div className="flex items-center gap-2"><Button variant="ghost" size="icon" onClick={()=>setSelection(null)}><ChevronLeft/></Button><div><div className="font-semibold">{templateTitle(templateKey)}</div><div className="text-xs text-muted-foreground">Seçili sayfa şablonunun bölümleri</div></div></div><div className="grid gap-2 rounded-lg border p-3"><label className="text-sm font-medium" htmlFor="ticarti-template-choice">Sayfa şablonu</label><select id="ticarti-template-choice" className="h-10 rounded-md border bg-background px-3" value={templateKey} onChange={e=>selectTemplate(e.target.value)}>{templateNames.map(k=><option key={k} value={k}>{templateTitle(k)}</option>)}</select><label className="text-xs text-muted-foreground" htmlFor="ticarti-template-preview-path">Önizleme adresi (ürün/kategori slugı)</label><input id="ticarti-template-preview-path" className="h-9 rounded-md border bg-background px-3 text-sm" value={previewPath} onChange={e=>setPreviewPath(e.target.value)} placeholder="/product/ornek-urun"/><span className="text-xs text-muted-foreground">Bu alan yalnızca önizleme yolunu değiştirir. Kaydedilen ayarlar seçili JSON şablonuna aittir. </span></div><SectionList title={templateTitle(templateKey)} state={home} schemas={schemaMap} area="template" selection={selection} setSelection={setSelection} onMove={move} onToggle={toggle} onDelete={remove} onDuplicate={duplicateSection} onAdd={()=>setAddOpen(true)} onDrag={drag}/></div>
        :<EditorSidebarHome groupsCount={globalGroups.length} templateNames={templateNames} templateTitle={templateTitle} activeTemplate={templateKey} templateState={home} schemas={schemaMap} selection={selection} setSelection={setSelection} onMove={move} onToggle={toggle} onDelete={remove} onDuplicate={duplicateSection} onAdd={()=>setAddOpen(true)} onDrag={drag} onOpenSettings={()=>{setSelection({area:'settings'});setSettingsGroup(-1)}} onOpenGlobalSections={()=>setSelection({area:'header'})} onOpenTemplate={selectTemplate} />}
      </aside>
      <main className="min-w-0 grow overflow-auto bg-[#eef0f3] p-4 lg:p-6"><div className="mx-auto h-full transition-[width] duration-200" style={{width,maxWidth:'100%'}}>{previewUrl?<iframe ref={iframeRef} key={previewKey} src={previewUrl} title="Canlı mağaza önizleme" className="h-full min-h-[720px] w-full border bg-white shadow-sm" onLoad={sendPreview}/>:<div className="grid h-full min-h-[720px] place-items-center border bg-white text-sm text-muted-foreground">Mağaza domaini bulunamadı.</div>}</div></main>
    </div>

  </div><MediaLibraryDialog open={!!mediaPicker.open} onOpenChange={v=>setMediaPicker((p:any)=>({...p,open:v}))} onSelect={url=>{if(typeof mediaPicker.cb==='function')mediaPicker.cb(url)}} title={mediaPicker.title||'Medya seç'}/></>;
}
