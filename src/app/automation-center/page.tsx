import type { Metadata } from 'next';
import { Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Automation Center — Lazynext',
  description: 'Production automation dispatch, health monitoring, and execution policies.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { Button } from '@/components/ui';
import { AutomationCenter } from './AutomationCenter';

export const dynamic = 'force-dynamic';

export default async function AutomationCenterPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-display text-2xl flex items-center gap-2">
            <Zap className="h-6 w-6" /> Automation Center
          </h1>
          <p className="text-sm text-fg-secondary mt-1">
            Dispatch, monitor, and govern automation execution in production.
          </p>
        </div>
      </div>

      <AutomationCenter />
    </div>
  );
}
