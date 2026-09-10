import type { Metadata } from 'next';
import { Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Mailroom Operations — Lazynext',
  description: 'Track mail items, routes, deliveries, and postage across your organization.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MailroomOperationsService } from '@/lib/services/mailroom-operations-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { MailroomOperationsDashboard } from './MailroomOperationsDashboard';

export const dynamic = 'force-dynamic';

export default async function MailroomOperationsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Mailroom Operations</h1>
          <p className="text-sm text-fg-secondary mt-1">Track mail items, routes, deliveries, and postage across your organization.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Mail}
            title="No workspace yet"
            description="Create a company first to access mailroom operations."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [items, routes, deliveries, postage, metrics, stats] = await Promise.all([
    MailroomOperationsService.listItems(organizationId),
    MailroomOperationsService.listRoutes(organizationId),
    MailroomOperationsService.listDeliveries(organizationId),
    MailroomOperationsService.listPostage(organizationId),
    MailroomOperationsService.getMailroomOperationsMetrics(organizationId),
    MailroomOperationsService.getMailroomOperationsStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Mail className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Mailroom Operations</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Track mail items, routes, deliveries, and postage across your organization.</p>
      </div>

      <MailroomOperationsDashboard
        organizationId={organizationId}
        items={items}
        routes={routes}
        deliveries={deliveries}
        postage={postage}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
