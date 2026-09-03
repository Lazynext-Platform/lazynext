import { auth } from '@/../auth';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Integrations — Lazynext',
  description: 'Connect Lazynext with external platforms and services.',
  robots: { index: false, follow: false },
};
import { IntegrationsManager } from '@/components/IntegrationsManager';

export const dynamic = 'force-dynamic';

export default async function IntegrationsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const connections = await prisma.platformConnection.findMany({
    where: { userId: session.user.id },
    select: { id: true, platform: true, platformUsername: true },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl">Integrations</h1>
        <p className="text-sm text-fg-secondary mt-1">
          {connections.length} connected · 16 available
        </p>
      </div>

      <IntegrationsManager initialConnections={connections} />
    </div>
  );
}
