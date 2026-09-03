import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { getUserPlanTier } from '@/lib/plan-tier';
import { getPlanLimits, PLAN_DESCRIPTIONS } from '@/lib/plan-limits';
import { CREDIT_PACKS } from '@/config/pricing';
import { getCredits } from '@/lib/credits';
import { Card, Badge, Button } from '@/components/ui';
import { CreditCard, Zap, Check, ArrowRight } from 'lucide-react';
import { BillingClient } from '@/components/BillingClient';

export const dynamic = 'force-dynamic';

export default async function BillingSettingsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const tier = await getUserPlanTier(session.user.id);
  const limits = getPlanLimits(tier);
  const credits = await getCredits(session.user.id);
  const planInfo = PLAN_DESCRIPTIONS[tier];

  // Get current usage counts
  const workspaces = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: { workspace: true },
  });
  const wsIds = workspaces.map((w) => w.workspace.id);

  const [projectCount, docCount, automationCount, agentCount, fileCount] = await Promise.all([
    prisma.project.count({ where: { workspaceId: { in: wsIds }, deletedAt: null } }),
    prisma.document.count({ where: { workspaceId: { in: wsIds }, deletedAt: null } }),
    prisma.automation.count({ where: { workspaceId: { in: wsIds } } }),
    prisma.agentDef.count({ where: { workspaceId: { in: wsIds } } }),
    prisma.fileStore.count({ where: { workspaceId: { in: wsIds }, deletedAt: null } }),
  ]);

  const usage = [
    { label: 'Projects', current: projectCount, limit: limits.maxProjects },
    { label: 'Documents', current: docCount, limit: limits.maxDocuments },
    { label: 'Automations', current: automationCount, limit: limits.maxAutomations },
    { label: 'Agents', current: agentCount, limit: limits.maxAgents },
    { label: 'Files', current: fileCount, limit: limits.maxFiles },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-8">
        <CreditCard className="h-6 w-6" />
        <h1 className="heading-display text-2xl">Billing & Plan</h1>
      </div>

      {/* Current plan */}
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

        {/* Usage bars */}
        <div className="flex flex-col gap-3 mt-6">
          <h3 className="label-mono">Current usage</h3>
          {usage.map((u) => {
            const pct = u.limit === -1 ? 0 : Math.min(100, (u.current / u.limit) * 100);
            return (
              <div key={u.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{u.label}</span>
                  <span className="text-fg-secondary">
                    {u.current} / {u.limit === -1 ? '∞' : u.limit}
                  </span>
                </div>
                <div
                  className="h-2 border-2"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--c-surface)' }}
                >
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: pct > 80 ? 'var(--c-danger)' : 'var(--c-accent)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Plan features */}
      <Card className="p-6 mb-6">
        <h2 className="heading-display text-lg mb-4">Plan features</h2>
        <div className="grid grid-cols-2 gap-3">
          <FeatureItem label="API access" enabled={limits.apiAccess} />
          <FeatureItem label="MCP access" enabled={limits.mcpAccess} />
          <FeatureItem label="Team invites" enabled={limits.teamInvites} />
          <FeatureItem label="Max file size" value={limits.maxFileUploadBytes === -1 ? '∞' : `${limits.maxFileUploadBytes / (1024 * 1024)} MB`} enabled={true} />
          <FeatureItem label="Max members" value={limits.maxMembers === -1 ? '∞' : String(limits.maxMembers)} enabled={true} />
          <FeatureItem label="Monthly credit cap" value={limits.monthlyCreditCap === 0 ? 'Unlimited' : String(limits.monthlyCreditCap)} enabled={true} />
        </div>
      </Card>

      {/* Upgrade / buy credits */}
      <Card className="p-6">
        <h2 className="heading-display text-lg mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5" /> Buy credits
        </h2>
        <p className="text-sm text-fg-secondary mb-4">
          Credits power AI generation across the platform. Buy a pack to upgrade your plan tier.
        </p>
        <BillingClient packs={CREDIT_PACKS} currentTier={tier} />
      </Card>
    </div>
  );
}

function FeatureItem({ label, enabled, value }: { label: string; enabled: boolean; value?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {enabled ? (
        <Check className="h-4 w-4" style={{ color: 'var(--c-success)' }} strokeWidth={3} />
      ) : (
        <span className="h-4 w-4 flex items-center justify-center text-xs" style={{ color: 'var(--c-fg-muted)' }}>—</span>
      )}
      <span className={enabled ? '' : 'text-fg-muted'}>
        {label}{value ? `: ${value}` : ''}
      </span>
    </div>
  );
}
