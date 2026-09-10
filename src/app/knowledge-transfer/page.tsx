import type { Metadata } from 'next';
import { BookOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Knowledge Transfer — Lazynext',
  description: 'Manage knowledge articles, mentorships, transfer sessions, and plans.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { KnowledgeTransferService } from '@/lib/services/knowledge-transfer-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { KnowledgeTransferDashboard } from './KnowledgeTransferDashboard';

export const dynamic = 'force-dynamic';

export default async function KnowledgeTransferPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Knowledge Transfer</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage knowledge articles, mentorships, transfer sessions, and plans.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={BookOpen}
            title="No workspace yet"
            description="Create a company first to access knowledge transfer management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [articles, mentorships, sessions, plans, metrics, stats] = await Promise.all([
    KnowledgeTransferService.listArticles(organizationId),
    KnowledgeTransferService.listMentorships(organizationId),
    KnowledgeTransferService.listSessions(organizationId),
    KnowledgeTransferService.listPlans(organizationId),
    KnowledgeTransferService.getKnowledgeTransferMetrics(organizationId),
    KnowledgeTransferService.getKnowledgeTransferStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Knowledge Transfer</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage knowledge articles, mentorships, transfer sessions, and plans.</p>
      </div>

      <KnowledgeTransferDashboard
        organizationId={organizationId}
        articles={articles}
        mentorships={mentorships}
        sessions={sessions}
        plans={plans}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
