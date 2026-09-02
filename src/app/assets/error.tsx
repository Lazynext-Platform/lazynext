'use client';
import { useEffect } from 'react';
import { useI18n } from '@/i18n/provider';
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="min-h-screen flex items-center justify-center text-fg bg-app" role="alert" aria-live="assertive">
      <div className="max-w-md px-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t('error.title')}</h1>
        <p className="mt-3 text-sm text-fg-faint">{t('error.desc')}</p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <button onClick={reset} className="text-sm text-fg-secondary hover:text-fg transition">{t('error.retry')}</button>
          <a href="/" className="text-sm text-fg-secondary hover:text-fg transition">{t('error.back')}</a>
        </div>
      </div>
    </main>
  );
}
