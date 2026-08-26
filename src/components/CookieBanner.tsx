'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/provider';

/**
 * GDPR cookie consent banner.
 * Shows on first visit (no 'cookie-consent' cookie).
 * Stores consent choice in a cookie (365 days).
 * Only shows in regions that require consent (EU/EEA/UK), but we show
 * it globally with a clear accept/decline — simpler and safer.
 */
export function CookieBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = document.cookie.match(/(?:^|;\s*)cookie-consent=([^;]+)/);
      if (!consent) setVisible(true);
    } catch {
      /* ignore */
    }
  }, []);

  function setConsent(accepted: boolean) {
    const value = accepted ? 'accepted' : 'declined';
    document.cookie = `cookie-consent=${value}; path=/; max-age=31536000; samesite=lax`;
    setVisible(false);
    // Dispatch event so analytics scripts can react
    window.dispatchEvent(new CustomEvent('cookie-consent', { detail: { accepted } }));
  }

  if (!visible) return null;

  const tr = { msg: t('cookie.msg'), accept: t('cookie.accept'), decline: t('cookie.decline'), link: t('cookie.link') };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-popover px-4 py-4 shadow-2xl"
      role="dialog"
      aria-label={t('common.cookieConsent')}
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-fg-secondary">
          {tr.msg}{' '}
          <a href="/privacy" className="underline hover:text-fg">{tr.link}</a>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setConsent(false)}
            className="rounded-lg border border-line px-4 py-2 text-xs font-medium text-fg-secondary transition hover:bg-hover"
          >
            {tr.decline}
          </button>
          <button
            onClick={() => setConsent(true)}
            className="rounded-lg px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
            style={{ background: '#00b2fc' }}
          >
            {tr.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
