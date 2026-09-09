import type { Metadata } from 'next';
import { Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Email Campaigns — Lazynext',
  description: 'Create, send, and track email marketing campaigns.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmailCampaignService } from '@/lib/services/email-campaign-service';
import { EmailTemplateService } from '@/lib/services/email-template-service';
import { SubscriberService } from '@/lib/services/subscriber-service';
import { EmailABTestService } from '@/lib/services/email-ab-test-service';
import { DripSequenceService } from '@/lib/services/drip-sequence-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { EmailCampaigns, type CampaignRecord, type TemplateRecord, type SubscriberRecord, type ListRecord } from './EmailCampaigns';

export const dynamic = 'force-dynamic';

export default async function EmailCampaignsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Email Campaigns</h1>
          <p className="text-sm text-fg-secondary mt-1">Create, send, and track email marketing campaigns.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Mail}
            title="No workspace yet"
            description="Create a company first to access email campaigns."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const ws = workspaces[0];

  const [overview, campaigns, templates, subscribers, lists, abTestStats, dripStats] = await Promise.all([
    EmailCampaignService.getOverview(ws.id),
    EmailCampaignService.list(ws.id),
    EmailTemplateService.list(ws.id),
    SubscriberService.listSubscribers(ws.id),
    SubscriberService.listLists(ws.id),
    EmailABTestService.getStats(ws.id),
    DripSequenceService.getStats(ws.id),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Mail className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Email Campaigns</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Create, send, and track email marketing campaigns.</p>
      </div>

      <EmailCampaigns
        organizationId={ws.organizationId}
        workspaceId={ws.id}
        userId={session.user.id}
        overview={overview}
        campaigns={campaigns as unknown as CampaignRecord[]}
        templates={templates as unknown as TemplateRecord[]}
        subscribers={subscribers as unknown as SubscriberRecord[]}
        lists={lists as unknown as ListRecord[]}
        abTestStats={abTestStats}
        dripStats={dripStats}
      />
    </div>
  );
}
