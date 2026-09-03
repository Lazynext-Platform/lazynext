'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { LOCALES, RTL_LOCALES, type Locale, messages, appMessages, loadLocaleMessages } from './messages';

 
function get(obj: Record<string, unknown> | undefined, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
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
  const [localeMessages, setLocaleMessages] = useState<any>(messages[locale] || messages.en);
  const [localeAppMessages, setLocaleAppMessages] = useState<any>(appMessages[locale] || appMessages.en);
  const [loadedLocales, setLoadedLocales] = useState<Set<Locale>>(new Set(['en']));

  // Load locale messages when locale changes
  useEffect(() => {
    if (loadedLocales.has(locale)) {
      setLocaleMessages(messages[locale] || messages.en);
      setLocaleAppMessages(appMessages[locale] || appMessages.en);
      return;
    }
    let cancelled = false;
    loadLocaleMessages(locale).then(({ messages: msgs, appMessages: appMsgs }) => {
      if (cancelled) return;
      // Store in the static objects for future synchronous access
      messages[locale] = msgs;
      appMessages[locale] = appMsgs;
      setLoadedLocales(prev => new Set(prev).add(locale));
      setLocaleMessages(msgs);
      setLocaleAppMessages(appMsgs);
    }).catch(() => {
      // Fallback to English if locale load fails — keeps current state
    });
    return () => { cancelled = true; };
  }, [locale, loadedLocales]);

  // Migrate old users: only when localStorage has a locale but NO cookie
  // exists at all. The cookie is the source of truth (set by the language
  // switcher and read by the server for SSR). localStorage is only used as
  // a fallback for users who set their locale before cookies were implemented.
  // If a cookie exists (any value), it takes precedence over localStorage.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('locale') as Locale | null;
      if (saved && (LOCALES as readonly string[]).includes(saved)) {
        // Only migrate if there is NO locale cookie at all
        const hasCookie = typeof document !== 'undefined' && document.cookie.match(/locale=[a-z]{2}/);
        if (!hasCookie) {
          if (saved !== locale) setLocaleState(saved);
          if (typeof document !== 'undefined') {
            document.cookie = `locale=${saved}; path=/; max-age=31536000; samesite=lax`;
          }
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
      document.documentElement.dir = RTL_LOCALES.has(l) ? 'rtl' : 'ltr';
      // Persist to user's DB preferences (fire-and-forget; only if logged in)
      // Check for next-auth session cookie to avoid 401 console noise when logged out
      if (typeof document !== 'undefined' && document.cookie.includes('next-auth.session-token=')) {
        fetch('/api/me/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale: l }),
        }).catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = get(localeMessages, key) ?? get(messages.en, key) ?? key;
      let s: string = typeof raw === 'string' ? raw : key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
      }
      return s;
    },
    [localeMessages],
  );

  const appText = useCallback(
    (id: string) => localeAppMessages?.[id] ?? appMessages.en[id] ?? { title: id, description: '' },
    [localeAppMessages],
  );

  return <I18nContext.Provider value={{ locale, setLocale, t, appText }}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18nContext);
  if (!c) throw new Error('useI18n must be used inside I18nProvider');
  return c;
}
