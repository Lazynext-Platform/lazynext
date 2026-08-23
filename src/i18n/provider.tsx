'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { LOCALES, type Locale, messages, appMessages } from './messages';

/* eslint-disable @typescript-eslint/no-explicit-any */
function get(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

interface Ctx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  appText: (id: string) => { title: string; description: string };
}

const I18nContext = createContext<Ctx | null>(null);

// initialLocale is read from cookie server-side (RootLayout) and passed in: SSR and client first frame use the same locale,
// completely eliminating hydration mismatch caused by "SSR English → client useEffect switches to Chinese" (React #418).
export function I18nProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || 'en');

  // Migrate old users: only when localStorage has it but cookie doesn't (initialLocale didn't reach the expected value),
  // adopt it and write the cookie so next SSR can read it → first frame fully consistent thereafter.
  // First frame still = initialLocale, doesn't break this hydration.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('locale') as Locale | null;
      if (saved && (LOCALES as readonly string[]).includes(saved)) {
        if (saved !== locale) setLocaleState(saved);
        if (typeof document !== 'undefined' && !document.cookie.includes(`locale=${saved}`)) {
          document.cookie = `locale=${saved}; path=/; max-age=31536000; samesite=lax`;
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem('locale', l);
      document.cookie = `locale=${l}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = l;
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let s = get(messages[locale], key) ?? get(messages.en, key) ?? key;
      if (typeof s === 'string' && vars) {
        for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
      }
      return s as string;
    },
    [locale],
  );

  const appText = useCallback(
    (id: string) => appMessages[locale]?.[id] ?? appMessages.en[id] ?? { title: id, description: '' },
    [locale],
  );

  return <I18nContext.Provider value={{ locale, setLocale, t, appText }}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18nContext);
  if (!c) throw new Error('useI18n must be used inside I18nProvider');
  return c;
}
