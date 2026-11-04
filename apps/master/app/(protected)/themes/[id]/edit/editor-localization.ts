/** Theme-owned localization schema, independent of React and persistence. */
import {isTranslatableSetting, type ThemeSetting} from './theme-schema-contract';

export type LocaleCode = string;
export type TranslationValues = Record<string, Record<string, string>>;

const LOCALE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

export function normalizedLocale(value: string): LocaleCode {
  const locale = value.trim().replace(/_/g, '-');
  if (!LOCALE.test(locale)) throw new Error('Invalid locale');
  return locale.toLowerCase();
}

export function validateTranslationValue(setting: ThemeSetting, value: unknown): value is string {
  return isTranslatableSetting(setting) && typeof value === 'string';
}

/** Pure fallback; returns nothing rather than the wrong language for missing content. */
export function localizedSettingValue(
  setting: ThemeSetting,
  baseValue: unknown,
  byLocale: TranslationValues,
  locale: LocaleCode,
  defaultLocale: LocaleCode,
): unknown {
  if (!isTranslatableSetting(setting) || !setting.id) return baseValue;
  const key = setting.id;
  const lookup = (code: string) => byLocale[normalizedLocale(code)]?.[key];
  const localized = lookup(locale);
  if (localized !== undefined) return localized;
  const fallback = lookup(defaultLocale);
  return fallback === undefined ? baseValue : fallback;
}

/** Immutable update of translated values; never modifies the global theme settings object. */
export function withTranslation(
  current: TranslationValues,
  setting: ThemeSetting,
  locale: string,
  value: unknown,
): TranslationValues {
  if (!setting.id || !validateTranslationValue(setting,value)) throw new Error('Setting is not translatable text');
  const key = normalizedLocale(locale);
  return {...current, [key]: {...current[key], [setting.id]:value}};
}
