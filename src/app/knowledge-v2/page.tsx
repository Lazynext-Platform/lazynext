import type { Metadata } from 'next';
import { BookOpen } from 'lucide-react';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { KnowledgeService } from '@/lib/services/knowledge-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { KnowledgeDashboard } from './KnowledgeDashboard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Knowledge v2 — Lazynext',
  description: 'Unified knowledge management with documents, version control, knowledge graphs, and advanced search.',
  robots: { index: false, follow: false },
};

export default async function KnowledgeV2Page() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Knowledge v2</h1>
          <p className="text-sm text-fg-secondary mt-1">Unified knowledge management with documents, version control, knowledge graphs, and advanced search.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={BookOpen}
            title="No workspace yet"
            description="Create a company first to start building your knowledge base."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const defaultWorkspace = workspaces[0];
  const organizationId = defaultWorkspace.organizationId;

  const [documents, tree, tags, stats] = await Promise.all([
    KnowledgeService.list(organizationId, { limit: 100 }),
    KnowledgeService.getTree(organizationId),
    KnowledgeService.getTags(organizationId),
    KnowledgeService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl">Knowledge v2</h1>
        <p className="text-sm text-fg-secondary mt-1">Unified knowledge management with documents, version control, knowledge graphs, and advanced search.</p>
      </div>

      <KnowledgeDashboard
        organizationId={organizationId}
        documents={documents.map((d) => ({
          id: d.id,
          title: d.title,
          excerpt: d.excerpt,
          status: d.status,
          version: d.version,
          slug: d.slug,
          tags: (() => { try { return JSON.parse(d.tags) as string[]; } catch { return []; } })(),
          updatedAt: d.updatedAt.toISOString(),
          workspaceId: d.workspaceId,
        }))}
        tree={tree}
        tags={tags}
        stats={stats}
        workspaces={workspaces.map((w) => ({ id: w.id, name: w.name, organizationId: w.organizationId }))}
      />
    </div>
  );
}
