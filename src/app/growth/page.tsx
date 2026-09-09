import type { Metadata } from 'next';
import { Sparkles, Megaphone, TrendingUp, Palette } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Growth — Lazynext',
  description: 'Growth & marketing dashboard — creative performance, campaigns, and insights.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CreativeIntegrationService } from '@/lib/services/creative-integration';
import { AgentSeedService } from '@/lib/services/agent-seed';
import { CreativeBudgetBridge } from '@/lib/services/creative-budget-bridge';
import { Card, Button, EmptyState } from '@/components/ui';
import { GrowthDashboard } from './GrowthDashboard';

export const dynamic = 'force-dynamic';

export default async function GrowthPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Growth</h1>
          <p className="text-sm text-fg-secondary mt-1">
            Growth &amp; marketing dashboard — creative performance, campaigns, and insights.
          </p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Sparkles}
            title="No workspace yet"
            description="Create a company first to start tracking growth and creative performance."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const defaultWorkspace = workspaces[0];
  const [dashboard, agentStatus, creativeBudget] = await Promise.all([
    CreativeIntegrationService.getGrowthDashboard(
      defaultWorkspace.id,
      defaultWorkspace.organizationId,
      session.user.id,
    ),
    AgentSeedService.checkSeededAgents(defaultWorkspace.id).catch(() => []),
    CreativeBudgetBridge.getCreativeBudgetSummary(
      defaultWorkspace.id,
      defaultWorkspace.organizationId,
    ).catch(() => ({
      totalSpent: 0,
      byCreativeType: {},
      spentThisMonth: 0,
      trend: [],
      entryCount: 0,
    })),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="heading-display text-2xl flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-accent-primary" /> Growth
          </h1>
          <p className="text-sm text-fg-secondary mt-1">
            Growth &amp; marketing dashboard — creative performance, campaigns, and insights.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button href="/creative-studio" variant="secondary">
            <Palette className="h-4 w-4" /> Creative Studio
          </Button>
          <Button href="/creative/director" variant="secondary">
            <Sparkles className="h-4 w-4" /> Creative Director
          </Button>
          <Button href="/performance-loop" variant="secondary">
            <Megaphone className="h-4 w-4" /> Performance Loop
          </Button>
        </div>
      </div>

      <GrowthDashboard
        dashboard={dashboard}
        agentStatus={agentStatus}
        creativeBudget={creativeBudget}
      />
    </div>
  );
}
