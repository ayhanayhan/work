'use client';
/* Schema-driven controls; settings values remain in the owning editor state. */
import {useMemo} from 'react';
import {ChevronDown} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {ThemeField} from './theme-field';
import {settingGroups,type ThemeFieldResources} from './editor-model';
import {isTranslatableSetting} from './theme-schema-contract';


/**
 * One schema-driven settings list for global, section, and block controls.
 * Groups follow the source theme schema. No heuristic Content/Style tabs:
 * those categories hid legitimate controls and made an empty-looking panel.
 * The first group is expanded initially; other groups remain accessible.
 */
export function SettingsPanel({rows,valueOf,onChange,resources}:{rows:any[];valueOf:(row:any)=>any;onChange:(row:any,v:any)=>void;resources?:ThemeFieldResources}){
  const {t}=useTranslation();
  const groups=useMemo(()=>settingGroups(rows,t),[rows,t]);
  if (!groups.length) return <p className="text-sm text-muted-foreground">{String(t('themeEditor.noSettings',{defaultValue:'Bu bölüm için düzenlenebilir ayar bulunmuyor.'}))}</p>;
  return <div className="grid gap-3">
    {groups.map((group,index)=><details key={`${group.title}-${index}`} open={index===0 ? true : undefined} className="group rounded-lg border bg-background">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-sm font-medium">
        <span>{group.title}</span><ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180"/>
      </summary>
      <div className="grid gap-4 border-t px-3 py-4">
        {group.rows.map((row:any,j:number)=><div key={`${row.id||row.type}-${j}`} className="grid gap-1">
          {isTranslatableSetting(row) && <span className="w-fit rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground" title="Bu alan tema şemasında çevrilebilir olarak işaretlenmiş. Dil bazlı düzenleme henüz etkin değil.">Çevrilebilir alan</span>}
          <ThemeField row={row} value={valueOf(row)} onChange={v=>onChange(row,v)} resources={resources}/>
        </div>)}
      </div>
    </details>)}
  </div>;
}
