'use client';

import { useI18n } from '@/i18n/provider';

// Language toggle (EN/ZH), default English. Click to switch between en / zh, persisted to localStorage.
export function LangToggle() {
  const { locale, setLocale } = useI18n();
  const cur = locale === 'zh' ? 'zh' : 'en';
  return (
    <div className="flex items-center rounded-full bg-white/10 p-0.5 text-xs font-medium" title="Switch language / 切换语言">
      {(['en', 'zh'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`rounded-full px-2.5 py-1.5 transition ${cur === l ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
          style={cur === l ? { background: '#00b2fc' } : undefined}
        >
          {l === 'en' ? 'EN' : '中'}
        </button>
      ))}
    </div>
  );
}
