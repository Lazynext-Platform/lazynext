import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Automation — Lazynext',
  description: 'Automation detail with definition and run history.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { Button } from '@/components/ui';
import { AutomationService } from '@/lib/services/automation';
import { AutomationDetail } from './AutomationDetail';

export const dynamic = 'force-dynamic';

interface AutomationDetailData {
  id: string;
  name: string;
  trigger: string;
  enabled: boolean;
  definition: string;
  runs: { id: string; status: string; startedAt: Date; completedAt: Date | null }[];
  _count: { runs: number };
}

export default async function AutomationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  // Verify ownership
  const ownership = await safePrisma(() =>
    prisma.automation.findFirst({
      where: { id, workspaceId: { in: wsIds } },
      select: { id: true },
    }),
  null);

  if (!ownership) {
    notFound();
  }

  const automation = (await AutomationService.get(id)) as AutomationDetailData | null;
  if (!automation) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/automations" className="flex items-center gap-1 text-sm text-fg-secondary hover:text-fg mb-4">
        <ArrowLeft className="h-4 w-4" /> All automations
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div
          className="flex h-10 w-10 items-center justify-center border-2"
          style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
        >
          <Zap className="h-5 w-5" />
        </div>
        <h1 className="heading-display text-2xl">{automation.name}</h1>
      </div>

      <AutomationDetail
        automationId={automation.id}
        name={automation.name}
        trigger={automation.trigger}
        enabled={automation.enabled}
        definition={automation.definition}
        runs={automation.runs.map((r) => ({
          id: r.id,
          status: r.status,
          startedAt: r.startedAt.toISOString(),
          completedAt: r.completedAt ? r.completedAt.toISOString() : null,
        }))}
        totalRuns={automation._count.runs}
      />
    </div>
  );
}
