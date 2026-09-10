import type { Metadata } from 'next';
import { Megaphone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Communications & PR — Lazynext',
  description: 'Manage press releases, media contacts, crises, mentions, and speaker opportunities.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CommunicationsService } from '@/lib/services/communications-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { CommunicationsDashboard } from './CommunicationsDashboard';

export const dynamic = 'force-dynamic';

export default async function CommunicationsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Communications & PR</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage press releases, media contacts, crises, mentions, and speaker opportunities.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Megaphone}
            title="No workspace yet"
            description="Create a company first to access corporate communications."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [pressReleases, mediaContacts, crises, mentions, speakerOpportunities, metrics, stats] = await Promise.all([
    CommunicationsService.listPressReleases(organizationId),
    CommunicationsService.listMediaContacts(organizationId),
    CommunicationsService.listCrises(organizationId),
    CommunicationsService.listMentions(organizationId),
    CommunicationsService.listSpeakerOpportunities(organizationId),
    CommunicationsService.getPRMetrics(organizationId),
    CommunicationsService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Communications & PR</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage press releases, media contacts, crises, mentions, and speaker opportunities.</p>
      </div>

      <CommunicationsDashboard
        organizationId={organizationId}
        pressReleases={pressReleases}
        mediaContacts={mediaContacts}
        crises={crises}
        mentions={mentions}
        speakerOpportunities={speakerOpportunities}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
