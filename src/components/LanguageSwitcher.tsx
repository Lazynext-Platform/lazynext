'use client';

import { Globe } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/i18n/messages';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="relative">
      <Globe className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
      <select
        aria-label={t('common.language')}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="w-[110px] cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-8 pr-6 text-sm font-medium text-white outline-none transition focus:border-[#00b2fc]"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} className="bg-neutral-900 text-white">
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
