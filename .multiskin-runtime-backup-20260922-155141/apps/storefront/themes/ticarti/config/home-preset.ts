import preset from './home-preset.json';
export function sourceHomePreset(){const p:any=preset;return (p.order||[]).map((id:string,index:number)=>{const section:any=p.sections?.[id]||{};return {id,sourceId:id,sectionType:String(section.type||'rich_text'),sortOrder:index,enabled:section.disabled!==true,settings:{...(section.settings||{}),__sourceId:id}}})}
