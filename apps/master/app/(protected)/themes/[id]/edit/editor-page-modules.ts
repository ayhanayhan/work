/** Page module catalog. The installed theme owns section definitions and defaults.
 * Never inserts platform-defined Liquid or mutates a different page template.
 */
export type ThemeSectionDefinition = {type?:unknown; schema?:{name?:unknown;presets?:unknown};[key:string]:unknown};

export function isFaqSection(definition:ThemeSectionDefinition):boolean {
  const type=String(definition?.type??'').toLowerCase();
  // Names are only for discovery. Rendering always uses the theme's own section.
  return type==='accordion'||type==='faq'||type==='frequently-asked-questions'||type==='faq-accordion';
}

/** Sorted with reusable FAQ first while retaining original order for all other types.
 * A theme can omit FAQ entirely; the editor never manufactures unsupported sections.
 */
export function availablePageSections<T extends ThemeSectionDefinition>(definitions:readonly T[]):T[] {
  const valid=definitions.filter(row=>typeof row?.type==='string' && row.type.trim().length>0);
  return [...valid.filter(isFaqSection),...valid.filter(row=>!isFaqSection(row))];
}
