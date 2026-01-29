import { en, type Translations } from './en.js';
import { ja } from './ja.js';
import { getLocale, setLocale as setConfigLocale, type Locale } from '../config.js';

const translations: Record<Locale, Translations> = { en, ja };

export function setLocale(locale: Locale): void {
  setConfigLocale(locale);
}

export function t(): Translations {
  return translations[getLocale()];
}

// Template string interpolation helper
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}

export { type Translations };
export { getLocale, type Locale } from '../config.js';
