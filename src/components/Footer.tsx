'use client';

import { useI18n } from '@/i18n/provider';

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-white/10 py-8 text-center text-sm text-white/40">
      <p>
        Lazynext · {t('common.poweredBy')}{' '}
        <a href="https://atlascloud.ai?utm_source=github&utm_campaign=ecommerce-studio" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-400 hover:underline">
          Atlas Cloud
        </a>
      </p>
    </footer>
  );
}
