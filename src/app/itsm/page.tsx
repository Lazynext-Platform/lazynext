import type { Metadata } from 'next';
import { LifeBuoy } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Help Desk / ITSM — Lazynext',
  description: 'Incident management, change requests, and knowledge base.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ITSMService } from '@/lib/services/itsm-service';
import { ChangeManagementService } from '@/lib/services/change-management-service';
import { KnowledgeBaseService } from '@/lib/services/knowledge-base-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { ITSMDashboard } from './ITSMDashboard';

export const dynamic = 'force-dynamic';

export default async function ITSMPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Help Desk / ITSM</h1>
          <p className="text-sm text-fg-secondary mt-1">Incident management, change requests, and knowledge base.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={LifeBuoy}
            title="No workspace yet"
            description="Create a company first to start managing your IT service desk."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const [incidents, slaBreaches, changes, articles, stats] = await Promise.all([
    ITSMService.list(organizationId),
    ITSMService.getSLABreaches(organizationId),
    ChangeManagementService.list(organizationId),
    KnowledgeBaseService.list(organizationId, { status: 'published' }),
    Promise.all([
      ITSMService.getStats(organizationId),
      ChangeManagementService.getStats(organizationId),
      KnowledgeBaseService.getStats(organizationId),
    ]).then(([incidents, changes, knowledge]) => ({ incidents, changes, knowledge })),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Help Desk / ITSM</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Incident management, change requests, and knowledge base.</p>
      </div>

      <ITSMDashboard
        organizationId={organizationId}
        incidents={incidents}
        slaBreaches={slaBreaches}
        changes={changes}
        articles={articles}
        stats={stats}
      />
    </div>
  );
}
