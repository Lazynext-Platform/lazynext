'use client';

import { useI18n } from '@/i18n/provider';

/**
 * Reusable full-page loading spinner for Next.js loading.tsx files.
 * Uses the existing i18n `common.loadingDots` translation.
 */
export default function LoadingSpinner() {
  const { t } = useI18n();
  return (
    <main className="min-h-screen flex items-center justify-center text-fg bg-app" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fg-faint border-t-fg" />
        <p className="text-sm text-fg-faint">{t('common.loadingDots')}</p>
      </div>
    </main>
  );
}
