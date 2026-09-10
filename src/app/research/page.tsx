import type { Metadata } from 'next';
import { Search, Plus } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Research — Lazynext',
  description: 'Research sessions with AI-powered findings and citations.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ResearchService } from '@/lib/services/research';
import { Card, Button, EmptyState } from '@/components/ui';
import { ResearchSessionList } from './ResearchSessionList';

export const dynamic = 'force-dynamic';

export default async function ResearchPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Research</h1>
          <p className="text-sm text-fg-secondary mt-1">Research sessions with AI-powered findings and citations.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Search}
            title="No workspace yet"
            description="Create a company first to start running research sessions."
            action={<Button href="/company/new"><Plus className="h-4 w-4" /> Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const defaultWorkspace = workspaces[0];
  const sessions = await ResearchService.listSessions(defaultWorkspace.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="heading-display text-2xl">Research</h1>
          <p className="text-sm text-fg-secondary mt-1">Research sessions with AI-powered findings and citations.</p>
        </div>
        <ResearchSessionList
          sessions={sessions.map((s) => ({
            id: s.id,
            query: s.query,
            status: s.status,
            summary: s.summary,
            citationCount: s._count?.citations ?? 0,
            updatedAt: s.updatedAt.toISOString(),
          }))}
          defaultWorkspaceId={defaultWorkspace.id}
          defaultOrganizationId={defaultWorkspace.organizationId}
        />
      </div>

      {sessions.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={Search}
            title="No research sessions yet"
            description="Start a new research session to gather findings with citations."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => (
            <a key={s.id} href={`/research/${s.id}`} className="group">
              <Card className="p-5 h-full hover:border-accent-primary transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <Search className="h-5 w-5 text-fg-secondary" />
                  <span className="text-xs text-fg-muted">{s._count?.citations ?? 0} citations</span>
                </div>
                <h3 className="font-semibold text-sm mb-1 group-hover:text-accent-primary line-clamp-2">{s.query}</h3>
                {s.summary && (
                  <p className="text-xs text-fg-secondary line-clamp-2">{s.summary}</p>
                )}
                <div className="mt-3 text-xs text-fg-muted">
                  Updated {new Date(s.updatedAt).toLocaleDateString()}
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
