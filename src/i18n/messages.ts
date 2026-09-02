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

// Dynamic locale loader — returns messages and appMessages for a locale
// English is returned synchronously (already loaded); others are dynamically imported
export async function loadLocaleMessages(locale: Locale): Promise<{ messages: LocaleMessages; appMessages: LocaleAppMessages }> {
  if (locale === 'en') {
    return { messages: enMessages, appMessages: enAppMessages };
  }
  try {
    const mod = await import(`./locales/${locale}`);
    return {
      messages: mod[`${locale}Messages`],
      appMessages: mod[`${locale}AppMessages`],
    };
  } catch {
    // Fallback to English if locale file fails to load
    return { messages: enMessages, appMessages: enAppMessages };
  }
}
