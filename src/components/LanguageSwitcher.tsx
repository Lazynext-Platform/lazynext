'use client';

import { Globe } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/i18n/messages';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="relative">
      <Globe className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" />
      <select
        aria-label={t('common.language')}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="w-[110px] cursor-pointer appearance-none rounded-xl border border-line bg-surface py-2 pl-8 pr-6 text-sm font-medium text-fg outline-none transition focus:border-[#00b2fc]"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} className="text-fg">
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
