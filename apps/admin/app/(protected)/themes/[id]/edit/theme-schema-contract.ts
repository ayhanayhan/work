/**
 * TICARTI Theme Schema Contract v1.
 * The installed theme, not the platform, owns groups, setting IDs and defaults.
 * This module is deliberately pure: no React, persistence, tenant data or network.
 */
export type ThemeSetting = {
  id?: string;
  type: string;
  label?: string;
  default?: unknown;
  options?: Array<{value: string | number; label: string}>;
  translatable?: boolean;
  [key: string]: unknown;
};
export type ThemeSettingGroup = {
  name: string;
  settings: ThemeSetting[];
  [key: string]: unknown;
};
export type SchemaDiagnostic = {
  path: string;
  code: 'invalid_group' | 'invalid_settings' | 'missing_id' | 'duplicate_id' | 'invalid_type' | 'invalid_translation_flag' | 'invalid_option';
  message: string;
};
export type ThemeSchemaResult = {
  groups: ThemeSettingGroup[];
  diagnostics: SchemaDiagnostic[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Existing API transports schema as an array or {groups:[]}. Preserve all original theme settings. */
export function readThemeSettingsSchema(input: unknown): ThemeSchemaResult {
  const rawGroups = Array.isArray(input) ? input : isRecord(input) && Array.isArray(input.groups) ? input.groups : [];
  const diagnostics: SchemaDiagnostic[] = [];
  const groups: ThemeSettingGroup[] = [];
  const seen = new Set<string>();
  rawGroups.forEach((raw, groupIndex) => {
    const path = `groups[${groupIndex}]`;
    if (!isRecord(raw) || typeof raw.name !== 'string') {
      diagnostics.push({path, code: 'invalid_group', message: 'Group must have a name.'});
      return;
    }
    if (!('settings' in raw)) return; // Shopify-style metadata-only groups are allowed.
    if (!Array.isArray(raw.settings)) {
      diagnostics.push({path, code: 'invalid_settings', message: 'Group settings must be an array.'});
      return;
    }
    raw.settings.forEach((item, index) => {
      const fieldPath = `${path}.settings[${index}]`;
      if (!isRecord(item) || typeof item.type !== 'string' || !item.type.trim()) {
        diagnostics.push({path: fieldPath, code:'invalid_type', message:'Setting requires a type.'});
        return;
      }
      if (item.type === 'header' || item.type === 'paragraph') return;
      if (typeof item.id !== 'string' || !item.id.trim()) {
        diagnostics.push({path: fieldPath, code:'missing_id', message:'Editable setting requires an id.'});
        return;
      }
      if (seen.has(item.id)) diagnostics.push({path: fieldPath, code:'duplicate_id', message:`Duplicate global setting id: ${item.id}`});
      seen.add(item.id);
      if (item.translatable !== undefined && typeof item.translatable !== 'boolean') {
        diagnostics.push({path: fieldPath, code:'invalid_translation_flag', message:'translatable must be boolean.'});
      }
      if ((item.type === 'select' || item.type === 'radio') && (!Array.isArray(item.options) || item.options.some(o => !isRecord(o) || !('value' in o)))) {
        diagnostics.push({path: fieldPath, code:'invalid_option', message:'Select/radio requires options with values.'});
      }
    });
    // Do not change ordering, field objects, defaults or unknown developer-defined options.
    groups.push(raw as unknown as ThemeSettingGroup);
  });
  return {groups, diagnostics};
}

/** Locale policy metadata only. Persistence and fallback require an API contract before enablement. */
export function isTranslatableSetting(setting: ThemeSetting): boolean {
  return setting.translatable === true && ['text','textarea','richtext','inline_richtext','html','url'].includes(setting.type);
}
