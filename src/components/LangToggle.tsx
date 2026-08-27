'use client';

import { useI18n } from '@/i18n/provider';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/i18n/messages';

// Language toggle: compact dropdown showing all supported locales.
// Replaces the old EN/ZH-only toggle with a full locale selector.
export function LangToggle() {
  const { locale, setLocale, t } = useI18n();
  return (
    <select
      aria-label={t('common.language')}
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className="select-chevron max-w-[40vw] shrink-0 cursor-pointer appearance-none rounded-full bg-elevated px-3 py-1.5 text-xs font-medium text-fg outline-none transition hover:bg-active"
      title={t('common.switchLanguage')}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l} className="text-fg">
          {LOCALE_NAMES[l]}
        </option>
      ))}
    </select>
  );
}
