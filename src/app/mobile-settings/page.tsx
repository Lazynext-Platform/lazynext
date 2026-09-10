import type { Metadata } from 'next';
import { Smartphone } from 'lucide-react';
import { auth } from '@/../auth';
import { MobileSettings } from './MobileSettings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mobile & PWA — Lazynext',
  description: 'Install, push notifications, offline storage, and platform info.',
  robots: { index: false, follow: false },
};

export default async function MobileSettingsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return (
      <div className="p-8">
        <a href="/login" className="btn-primary">
          Sign in
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <Smartphone className="h-6 w-6" />
        <h1 className="heading-display text-2xl">Mobile &amp; PWA</h1>
      </div>
      <MobileSettings />
    </div>
  );
}
