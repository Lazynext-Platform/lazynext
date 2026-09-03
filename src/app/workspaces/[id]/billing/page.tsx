import { redirect } from 'next/navigation';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { getUserPlanTier } from '@/lib/plan-tier';
import { getPlanLimits, PLAN_DESCRIPTIONS } from '@/lib/plan-limits';
import { getCredits } from '@/lib/credits';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button } from '@/components/ui';
import { CreditCard, ArrowLeft, Zap } from 'lucide-react';
import Link from 'next/link';
import { BillingClient } from '@/components/BillingClient';
import { CREDIT_PACKS } from '@/config/pricing';

export const dynamic = 'force-dynamic';

export default async function WorkspaceBillingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const workspace = await WorkspaceService.getForUser(id, session.user.id);
  if (!workspace) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p>Workspace not found.</p>
        <Link href="/workspaces" className="text-sm text-fg-secondary hover:text-fg">Back to workspaces</Link>
      </div>
    );
  }

  const tier = await getUserPlanTier(session.user.id);
  const limits = getPlanLimits(tier);
  const credits = await getCredits(session.user.id);
  const planInfo = PLAN_DESCRIPTIONS[tier];

  const [projectCount, docCount, fileCount, memberCount] = await Promise.all([
    prisma.project.count({ where: { workspaceId: id, deletedAt: null } }),
    prisma.document.count({ where: { workspaceId: id, deletedAt: null } }),
    prisma.fileStore.count({ where: { workspaceId: id, deletedAt: null } }),
    prisma.membership.count({ where: { workspaceId: id } }),
  ]);

  const usage = [
    { label: 'Projects', current: projectCount, limit: limits.maxProjects },
    { label: 'Documents', current: docCount, limit: limits.maxDocuments },
    { label: 'Files', current: fileCount, limit: limits.maxFiles },
    { label: 'Members', current: memberCount, limit: limits.maxMembers },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href={`/workspaces/${id}`} className="flex items-center gap-1 text-sm text-fg-secondary hover:text-fg mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to workspace
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <CreditCard className="h-6 w-6" />
        <div>
          <h1 className="heading-display text-2xl">Billing</h1>
          <p className="text-sm text-fg-secondary">{workspace.name}</p>
        </div>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="heading-display text-lg">{planInfo.label}</h2>
              <Badge variant={tier === 'free' ? 'default' : 'success'}>{tier}</Badge>
            </div>
            <p className="text-sm text-fg-secondary">{planInfo.description}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{credits}</p>
            <p className="text-xs text-fg-muted">credits remaining</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-6">
          <h3 className="label-mono">Workspace usage</h3>
          {usage.map((u) => {
            const pct = u.limit === -1 ? 0 : Math.min(100, (u.current / u.limit) * 100);
            return (
              <div key={u.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{u.label}</span>
                  <span className="text-fg-secondary">{u.current} / {u.limit === -1 ? '∞' : u.limit}</span>
                </div>
                <div className="h-2 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--c-surface)' }}>
                  <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct > 80 ? 'var(--c-danger)' : 'var(--c-accent)', borderRadius: 'var(--radius-sm)' }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="heading-display text-lg mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5" /> Buy credits
        </h2>
        <p className="text-sm text-fg-secondary mb-4">
          Credits power AI generation and are shared across all workspaces.
        </p>
        <BillingClient packs={CREDIT_PACKS} currentTier={tier} />
      </Card>
    </div>
  );
}
