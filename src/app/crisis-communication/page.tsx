import type { Metadata } from 'next';
import { Megaphone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Crisis Communication Management — Lazynext',
  description: 'Manage crisis plans, messages, stakeholder communications, and media inquiries.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CrisisCommunicationService } from '@/lib/services/crisis-communication-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { CrisisCommunicationDashboard } from './CrisisCommunicationDashboard';

export const dynamic = 'force-dynamic';

export default async function CrisisCommunicationPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Crisis Communication</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage crisis plans, messages, stakeholder communications, and media inquiries.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Megaphone}
            title="No workspace yet"
            description="Create a company first to access crisis communication."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [plans, messages, communications, inquiries, metrics, stats] = await Promise.all([
    CrisisCommunicationService.listCrisisPlans(organizationId),
    CrisisCommunicationService.listCrisisMessages(organizationId),
    CrisisCommunicationService.listStakeholderCommunications(organizationId),
    CrisisCommunicationService.listMediaInquiries(organizationId),
    CrisisCommunicationService.getCrisisCommunicationMetrics(organizationId),
    CrisisCommunicationService.getCrisisCommunicationStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Crisis Communication</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage crisis plans, messages, stakeholder communications, and media inquiries.</p>
      </div>

      <CrisisCommunicationDashboard
        organizationId={organizationId}
        plans={plans}
        messages={messages}
        communications={communications}
        inquiries={inquiries}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
