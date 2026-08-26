'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type SelectedTheme } from '@/lib/theme';
import { useI18n } from '@/i18n/provider';

/**
 * Three-way theme selector (Light / Dark / System) for the settings page.
 * System is the default and genuinely follows the OS preference live.
 */
export function ThemeSelector() {
  const { selected, setTheme } = useTheme();
  const { t } = useI18n();

  const options: { id: SelectedTheme; label: string; icon: typeof Sun; hint: string }[] = [
    { id: 'light', label: t('settings.themeLight'), icon: Sun, hint: t('settings.themeLight') },
    { id: 'dark', label: t('settings.themeDark'), icon: Moon, hint: t('settings.themeDark') },
    { id: 'system', label: t('settings.themeSystem'), icon: Monitor, hint: t('settings.themeSystem') },
  ];

  return (
    <div>
      <div role="radiogroup" aria-label={t('settings.theme')} className="grid grid-cols-3 gap-2">
        {options.map((o) => {
          const Icon = o.icon;
          const active = selected === o.id;
          return (
            <button
              key={o.id}
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(o.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm font-medium transition ${
                active
                  ? 'border-[#00b2fc] bg-[#00b2fc]/10 text-fg shadow-soft'
                  : 'border-line bg-surface text-fg-muted hover:border-line-strong hover:bg-elevated hover:text-fg-secondary'
              }`}
            >
              <Icon className="h-5 w-5" />
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-fg-faint">{t('settings.themeDesc')}</p>
    </div>
  );
}
