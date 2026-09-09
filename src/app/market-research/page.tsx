import type { Metadata } from 'next';
import { Search } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Market Research — Lazynext',
  description: 'Manage research projects, market segments, competitor analysis, and research insights.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MarketResearchService } from '@/lib/services/market-research-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { MarketResearchDashboard } from './MarketResearchDashboard';

export const dynamic = 'force-dynamic';

export default async function MarketResearchPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Market Research</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage research projects, market segments, competitor analysis, and research insights.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Search}
            title="No workspace yet"
            description="Create a company first to access market research management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [projects, segments, competitors, insights, metrics, stats] = await Promise.all([
    MarketResearchService.listProjects(organizationId),
    MarketResearchService.listSegments(organizationId),
    MarketResearchService.listCompetitors(organizationId),
    MarketResearchService.listInsights(organizationId),
    MarketResearchService.getMarketResearchMetrics(organizationId),
    MarketResearchService.getMarketResearchStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Search className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Market Research</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage research projects, market segments, competitor analysis, and research insights.</p>
      </div>

      <MarketResearchDashboard
        organizationId={organizationId}
        projects={projects}
        segments={segments}
        competitors={competitors}
        insights={insights}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
