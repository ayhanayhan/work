'use client';
import {useMemo,useState} from 'react';
import {ChevronLeft,ChevronRight,FileText,Layers3,Search,Settings2} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {arr,schemaText,type Selection} from './editor-model';
import {SectionList} from './section-list';
import type {ThemeSettingGroup} from './theme-schema-contract';

type SidebarHomeProps = {
  groupsCount:number;templateNames:string[];templateTitle:(key:string)=>string;
  activeTemplate:string;templateState:any;schemas:Map<string,any>;selection:Selection;
  setSelection:(selection:Selection)=>void;
  onMove:(area:any,id:string,delta:number)=>void;onToggle:(area:any,id:string)=>void;
  onDelete:(area:any,id:string)=>void;onDuplicate:(area:any,id:string)=>void;
  onAdd:(area:any)=>void;onDrag:(area:any,from:string,to:string)=>void;
  onOpenSettings:()=>void;onOpenGlobalSections:()=>void;onOpenTemplate:(key:string)=>void;
};

/** Theme-provided templates and sections form the primary editor navigation. */
export function EditorSidebarHome({groupsCount,templateNames,templateTitle,activeTemplate,templateState,schemas,selection,setSelection,onMove,onToggle,onDelete,onDuplicate,onAdd,onDrag,onOpenSettings,onOpenGlobalSections,onOpenTemplate}:SidebarHomeProps){
  const {t}=useTranslation();
  const [pageSearch,setPageSearch]=useState('');
  const [pagesOpen,setPagesOpen]=useState(false);
  const filtered=useMemo(()=>templateNames.filter(key=>templateTitle(key).toLocaleLowerCase().includes(pageSearch.toLocaleLowerCase())),[templateNames,templateTitle,pageSearch]);
  return <nav className="flex flex-col gap-4 p-4" aria-label="Tema düzenleyici">
    <div><h2 className="text-base font-semibold">Tasarım</h2><p className="text-xs text-muted-foreground">Sayfanızı ve bölümlerini düzenleyin.</p></div>
    <div className="rounded-lg border bg-muted/20 p-2">
      <button type="button" aria-expanded={pagesOpen} onClick={()=>setPagesOpen(x=>!x)} className="flex w-full items-center justify-between rounded-md p-2 text-left hover:bg-muted/60">
        <span className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0"/><span className="min-w-0"><span className="block text-[11px] text-muted-foreground">Düzenlenen sayfa</span><span className="block truncate text-sm font-semibold">{templateTitle(activeTemplate)}</span></span></span><ChevronRight className={`size-4 shrink-0 transition-transform ${pagesOpen?'rotate-90':''}`}/>
      </button>
      {pagesOpen&&<div className="grid gap-1 border-t pt-2"><label className="relative"><Search className="absolute left-2 top-2.5 size-4 text-muted-foreground"/><input aria-label="Sayfa şablonu ara" value={pageSearch} onChange={e=>setPageSearch(e.target.value)} className="h-9 w-full rounded-md border bg-background pl-8 pr-2 text-sm" placeholder="Sayfa ara"/></label><div className="max-h-60 overflow-auto">{filtered.map(key=><button key={key} type="button" aria-current={key===activeTemplate?'page':undefined} className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${key===activeTemplate?'bg-primary/10 font-semibold':''}`} onClick={()=>{onOpenTemplate(key);setPagesOpen(false)}}>{templateTitle(key)}</button>)}{filtered.length===0&&<p className="p-2 text-xs text-muted-foreground">Eşleşen şablon yok.</p>}</div></div>}
    </div>
    <SectionList title="Sayfa bölümleri" state={templateState} schemas={schemas} area="template" selection={selection} setSelection={setSelection} onMove={onMove} onToggle={onToggle} onDelete={onDelete} onDuplicate={onDuplicate} onAdd={onAdd} onDrag={onDrag}/>
    <div className="grid gap-1 border-t pt-3">
      <NavItem title="Header ve Footer" description="Ortak bölümleri düzenle" icon={<Layers3 className="size-4"/>} onClick={onOpenGlobalSections}/>
      <NavItem title={String(t('themeEditor.themeSettings',{defaultValue:'Tema ayarları'}))} description={`${groupsCount} tema ayar grubu`} icon={<Settings2 className="size-4"/>} onClick={onOpenSettings}/>
    </div>
  </nav>;
}
function NavItem({title,description,icon,onClick}:{title:string;description:string;icon:React.ReactNode;onClick:()=>void}){
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="text-muted-foreground">{icon}</span><span className="min-w-0 grow"><span className="block text-sm font-medium">{title}</span><span className="block text-xs text-muted-foreground">{description}</span></span><ChevronRight className="size-4 text-muted-foreground"/></button>;
}

/** Search works on names and fields provided by the installed theme schema. */
export function EditorSettingsNavigation({groups,onBack,onSelect}:{groups:ThemeSettingGroup[];onBack:()=>void;onSelect:(index:number)=>void}){
  const {t}=useTranslation();const [query,setQuery]=useState('');
  const visible=groups.map((group,index)=>({group,index})).filter(({group})=>`${schemaText(t,group.name)} ${arr(group.settings).map((field:any)=>`${field.id||''} ${schemaText(t,field.label||field.content||'')}`).join(' ')}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <div className="grid gap-3 p-4"><div className="flex items-center gap-2"><Button variant="ghost" size="icon" onClick={onBack} aria-label="Geri"><ChevronLeft/></Button><div><div className="font-semibold">{String(t('themeEditor.themeSettings',{defaultValue:'Tema Ayarları'}))}</div><div className="text-xs text-muted-foreground">{groups.length} ayar grubu · tema paketinden</div></div></div>
    <label className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><input className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" aria-label="Tema ayarlarında ara" placeholder="Ayar veya grup ara" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <div className="grid gap-1">{visible.map(({group,index})=><button type="button" key={index} onClick={()=>onSelect(index)} className="flex w-full items-center justify-between rounded-md border px-3 py-3 text-left hover:bg-muted/50"><span><span className="block text-sm font-medium">{schemaText(t,group.name,`Grup ${index+1}`)}</span><span className="text-xs text-muted-foreground">{arr(group.settings).filter((row:any)=>row?.id).length} ayar</span></span><ChevronRight className="size-4 text-muted-foreground"/></button>)}{!visible.length&&<p className="py-5 text-center text-sm text-muted-foreground">{groups.length?'Eşleşen ayar bulunamadı.':'Bu tema ayar grubu içermiyor.'}</p>}</div>
  </div>;
}
