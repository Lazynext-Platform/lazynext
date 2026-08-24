'use client';

import { useI18n } from '@/i18n/provider';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/i18n/messages';

// Language toggle: compact dropdown showing all supported locales.
// Replaces the old EN/ZH-only toggle with a full locale selector.
export function LangToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className="cursor-pointer appearance-none rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white outline-none transition hover:bg-white/20"
      title="Switch language"
    >
      {LOCALES.map((l) => (
        <option key={l} value={l} className="bg-neutral-900 text-white">
          {LOCALE_NAMES[l]}
        </option>
      ))}
    </select>
  );
}
