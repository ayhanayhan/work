/** Pure registry: keeps field selection and constraints separate from the React UI.
 * Unknown types remain visible as text inputs for backwards compatibility.
 * This is not a plugin executor: theme-provided code is never evaluated.
 */
export type FieldKind = 'header' | 'paragraph' | 'image_picker' | 'checkbox' | 'select' | 'radio' | 'range' | 'color' | 'color_background' | 'textarea' | 'richtext' | 'html' | 'inline_richtext' | 'url' | 'video_url' | 'number' | 'text';
export type FieldDefinition = {type?: unknown; id?: unknown; default?: unknown; min?: unknown; max?: unknown; step?: unknown; options?: unknown};
export const FIELD_KINDS: ReadonlySet<string> = new Set<FieldKind>(['header','paragraph','image_picker','checkbox','select','radio','range','color','color_background','textarea','richtext','html','inline_richtext','url','video_url','number','text']);
export function resolveFieldKind(setting: FieldDefinition): FieldKind {
  const raw = String(setting?.type || 'text');
  return FIELD_KINDS.has(raw) ? raw as FieldKind : 'text';
}
export function normalizeFieldValue(setting: FieldDefinition, value: unknown): unknown {
  const kind = resolveFieldKind(setting);
  if (kind === 'checkbox') return Boolean(value);
  if (kind === 'range' || kind === 'number') {
    const n = Number(value);
    if (!Number.isFinite(n)) return setting.default ?? 0;
    const min = typeof setting.min === 'number' ? setting.min : -Infinity;
    const max = typeof setting.max === 'number' ? setting.max : Infinity;
    return Math.max(min, Math.min(max, n));
  }
  if (kind === 'select' || kind === 'radio') {
    const options = Array.isArray(setting.options) ? setting.options : [];
    // Do not discard legacy saved values; validation can warn on unrecognized choices.
    if (options.length === 0) return value;
  }
  return value;
}
export function validateFieldValue(setting: FieldDefinition, value: unknown): string[] {
  const errors: string[] = [];
  const kind = resolveFieldKind(setting);
  if (kind === 'range' || kind === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) errors.push('invalid_number');
    else {
      if (typeof setting.min === 'number' && value < setting.min) errors.push('below_minimum');
      if (typeof setting.max === 'number' && value > setting.max) errors.push('above_maximum');
    }
  }
  if (kind === 'select' || kind === 'radio') {
    const opts = Array.isArray(setting.options) ? setting.options : [];
    if (opts.length && !opts.some((opt) => opt && typeof opt === 'object' && 'value' in opt && String((opt as {value:unknown}).value) === String(value))) errors.push('invalid_option');
  }
  return errors;
}
