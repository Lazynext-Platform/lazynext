export const LOCALES = ['en', 'zh', 'ja', 'es', 'ko', 'pt', 'fr', 'de', 'ar', 'hi', 'vi', 'th', 'id'] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  es: 'Español',
  ko: '한국어',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  ar: 'العربية',
  hi: 'हिन्दी',
  vi: 'Tiếng Việt',
  th: 'ภาษาไทย',
  id: 'Bahasa Indonesia',
};

// RTL languages (text direction right-to-left)
export const RTL_LOCALES: ReadonlySet<Locale> = new Set(['ar']);

 

// English is always loaded statically as the fallback locale
import { enMessages, enAppMessages } from './locales/en';

// Per-locale message loaders (dynamically imported by the provider)
export type LocaleMessages = typeof enMessages;
export type LocaleAppMessages = typeof enAppMessages;

// Static messages object — only English is populated; other locales are loaded dynamically
// by the I18nProvider via loadLocaleMessages()
export const messages: Record<Locale, any> = {
  en: enMessages,
  zh: {}, ja: {}, es: {}, ko: {}, pt: {}, fr: {}, de: {},
  ar: {}, hi: {}, vi: {}, th: {}, id: {},
};

export const appMessages: Record<Locale, Record<string, { title: string; description: string }>> = {
  en: enAppMessages,
  zh: {}, ja: {}, es: {}, ko: {}, pt: {}, fr: {}, de: {},
  ar: {}, hi: {}, vi: {}, th: {}, id: {},
};

// Dynamic locale loader — returns messages and appMessages for a locale.
// English is returned synchronously (already loaded). Non-English locales are
// fetched as static JSON from /locales/{locale}.json (served as a Cloudflare
// Workers asset) to avoid inlining ~4.5MB of translation data into the Worker
// bundle, which would exceed the 10 MiB compressed size limit.
export async function loadLocaleMessages(locale: Locale): Promise<{ messages: LocaleMessages; appMessages: LocaleAppMessages }> {
  if (locale === 'en') {
    return { messages: enMessages, appMessages: enAppMessages };
  }
  try {
    const res = await fetch(`/locales/${locale}.json`);
    if (!res.ok) throw new Error(`locale fetch failed: ${res.status}`);
    const data = await res.json() as { messages: LocaleMessages; appMessages: LocaleAppMessages };
    return { messages: data.messages, appMessages: data.appMessages };
  } catch {
    // Fallback to English if locale file fails to load
    return { messages: enMessages, appMessages: enAppMessages };
  }
}
