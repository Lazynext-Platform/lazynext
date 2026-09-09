import type { Metadata } from 'next';
import { BookOpen, Plus } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Knowledge — Lazynext',
  description: 'Your organization\'s knowledge bases — articles, notes, and research findings.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { KnowledgeService } from '@/lib/services/knowledge';
import { Card, Button, EmptyState } from '@/components/ui';
import { KnowledgeBaseList } from './KnowledgeBaseList';

export const dynamic = 'force-dynamic';

export default async function KnowledgePage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Knowledge</h1>
          <p className="text-sm text-fg-secondary mt-1">Your organization&apos;s knowledge bases — articles, notes, and research findings.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={BookOpen}
            title="No workspace yet"
            description="Create a company first to start building your knowledge base."
            action={<Button href="/company/new"><Plus className="h-4 w-4" /> Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const defaultWorkspace = workspaces[0];
  const knowledgeBases = await KnowledgeService.listKnowledgeBases(defaultWorkspace.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="heading-display text-2xl">Knowledge</h1>
          <p className="text-sm text-fg-secondary mt-1">Your organization&apos;s knowledge bases — articles, notes, and research findings.</p>
        </div>
        <KnowledgeBaseList
          knowledgeBases={knowledgeBases.map((kb) => ({
            id: kb.id,
            name: kb.name,
            description: kb.description,
            visibility: kb.visibility,
            articleCount: kb._count?.articles ?? 0,
            updatedAt: kb.updatedAt.toISOString(),
          }))}
          defaultWorkspaceId={defaultWorkspace.id}
          defaultOrganizationId={defaultWorkspace.organizationId}
        />
      </div>

      {knowledgeBases.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={BookOpen}
            title="No knowledge bases yet"
            description="Create your first knowledge base to start collecting articles and research findings."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {knowledgeBases.map((kb) => (
            <a key={kb.id} href={`/knowledge/${kb.id}`} className="group">
              <Card className="p-5 h-full hover:border-accent-primary transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <BookOpen className="h-5 w-5 text-fg-secondary" />
                  <span className="text-xs text-fg-muted">{kb._count?.articles ?? 0} articles</span>
                </div>
                <h3 className="font-semibold text-sm mb-1 group-hover:text-accent-primary">{kb.name}</h3>
                {kb.description && (
                  <p className="text-xs text-fg-secondary line-clamp-2">{kb.description}</p>
                )}
                <div className="mt-3 text-xs text-fg-muted">
                  Updated {new Date(kb.updatedAt).toLocaleDateString()}
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
