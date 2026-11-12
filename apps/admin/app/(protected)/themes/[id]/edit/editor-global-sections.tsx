'use client';

import {ChevronLeft} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {SectionList} from './section-list';
import type {Selection} from './editor-model';

type Area = 'header' | 'footer';
type Props = {
  activeArea: Area;
  onBack: () => void;
  onSwitch: (area: Area) => void;
  header: unknown;
  footer: unknown;
  schemas: Map<string, any>;
  selection: Selection;
  setSelection: (selection: Selection) => void;
  onMove: (area: Area, id: string, delta: number) => void;
  onToggle: (area: Area, id: string) => void;
  onDelete: (area: Area, id: string) => void;
  onDuplicate: (area: Area, id: string) => void;
  onDrag: (area: Area, from: string, to: string) => void;
};

/** Navigation for global groups; section values still belong to the theme draft. */
export function EditorGlobalSections({activeArea,onBack,onSwitch,header,footer,schemas,selection,setSelection,onMove,onToggle,onDelete,onDuplicate,onDrag}: Props) {
  return <div className="grid gap-4 p-4">
    <div className="flex items-center gap-2">
      <Button size="icon" variant="ghost" onClick={onBack} aria-label="Geri"><ChevronLeft/></Button>
      <div><div className="font-semibold">Global Sections</div><p className="text-xs text-muted-foreground">Temanın ortak Header ve Footer bölümleri</p></div>
    </div>
    <div className="grid grid-cols-2 gap-1 rounded-md bg-muted/50 p-1" role="group" aria-label="Ortak bölüm seçimi">
      {(['header','footer'] as const).map(area=><button key={area} type="button" aria-pressed={activeArea===area} onClick={()=>onSwitch(area)} className={`rounded px-3 py-2 text-sm font-medium ${activeArea===area?'bg-background shadow-sm':'text-muted-foreground hover:text-foreground'}`}>{area==='header'?'Header':'Footer'}</button>)}
    </div>
    <SectionList title={activeArea==='header'?'Header':'Footer'} state={activeArea==='header'?header:footer} schemas={schemas} area={activeArea} selection={selection} setSelection={setSelection} onMove={onMove} onToggle={onToggle} onDelete={onDelete} onDuplicate={onDuplicate} onAdd={()=>{}} onDrag={onDrag}/>
  </div>;
}
