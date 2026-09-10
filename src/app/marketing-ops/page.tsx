import type { Metadata } from 'next';
import { Megaphone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Marketing Operations — Lazynext',
  description: 'Content calendar, campaign tracker, and lead attribution.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ContentCalendarService } from '@/lib/services/content-calendar-service';
import { MarketingCampaignService } from '@/lib/services/marketing-campaign-service';
import { LeadAttributionService } from '@/lib/services/lead-attribution-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { MarketingOpsDashboard } from './MarketingOpsDashboard';

export const dynamic = 'force-dynamic';

export default async function MarketingOpsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Marketing Operations</h1>
          <p className="text-sm text-fg-secondary mt-1">Content calendar, campaign tracker, and lead attribution.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Megaphone}
            title="No workspace yet"
            description="Create a company first to access marketing operations."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [
    contentItems,
    upcomingContent,
    contentByPlatform,
    contentByType,
    contentStats,
    campaigns,
    activeCampaigns,
    campaignStats,
    budgetUtilization,
    attributions,
    attributionsBySource,
    attributionsByCampaign,
    conversionBySource,
    topPerformingSources,
    revenueBySource,
    attributionStats,
  ] = await Promise.all([
    ContentCalendarService.list(organizationId),
    ContentCalendarService.getUpcoming(organizationId),
    ContentCalendarService.getByPlatform(organizationId),
    ContentCalendarService.getByType(organizationId),
    ContentCalendarService.getStats(organizationId),
    MarketingCampaignService.list(organizationId),
    MarketingCampaignService.getActiveCampaigns(organizationId),
    MarketingCampaignService.getStats(organizationId),
    MarketingCampaignService.getBudgetUtilization(organizationId),
    LeadAttributionService.list(organizationId),
    LeadAttributionService.getBySource(organizationId),
    LeadAttributionService.getByCampaign(organizationId),
    LeadAttributionService.getConversionBySource(organizationId),
    LeadAttributionService.getTopPerformingSources(organizationId),
    LeadAttributionService.getRevenueBySource(organizationId),
    LeadAttributionService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Marketing Operations</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Content calendar, campaign tracker, and lead attribution.</p>
      </div>

      <MarketingOpsDashboard
        organizationId={organizationId}
        contentItems={contentItems}
        upcomingContent={upcomingContent}
        contentByPlatform={contentByPlatform}
        contentByType={contentByType}
        contentStats={contentStats}
        campaigns={campaigns}
        activeCampaigns={activeCampaigns}
        campaignStats={campaignStats}
        budgetUtilization={budgetUtilization}
        attributions={attributions}
        attributionsBySource={attributionsBySource}
        attributionsByCampaign={attributionsByCampaign}
        conversionBySource={conversionBySource}
        topPerformingSources={topPerformingSources}
        revenueBySource={revenueBySource}
        attributionStats={attributionStats}
      />
    </div>
  );
}
