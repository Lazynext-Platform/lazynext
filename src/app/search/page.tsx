import Link from 'next/link';
import { Search, FolderKanban, FileText, CheckSquare, Sparkles } from 'lucide-react';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { Card, Badge, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Link href="/login" className="btn-primary">Sign in</Link></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  const query = q?.trim() || '';

  const [projects, documents, tasks, creations] = query
    ? await Promise.all([
        prisma.project.findMany({
          where: { workspaceId: { in: wsIds }, deletedAt: null, OR: [{ name: { contains: query } }, { description: { contains: query } }] },
          take: 10,
        }),
        prisma.document.findMany({
          where: { workspaceId: { in: wsIds }, deletedAt: null, OR: [{ title: { contains: query } }, { content: { contains: query } }] },
          take: 10,
        }),
        prisma.task.findMany({
          where: { project: { workspaceId: { in: wsIds } }, deletedAt: null, OR: [{ title: { contains: query } }, { description: { contains: query } }] },
          take: 10,
          include: { project: { select: { name: true } } },
        }),
        prisma.creation.findMany({
          where: { userId: session.user.id, OR: [{ templateId: { contains: query } }, { prompt: { contains: query } }] },
          take: 10,
        }),
      ])
    : [[], [], [], []];

  const results = { projects, documents, tasks, creations };
  const total = results.projects.length + results.documents.length + results.tasks.length + results.creations.length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="heading-display text-2xl mb-2">Search</h1>
        {q && <p className="text-sm text-fg-secondary">{total} result{total !== 1 ? 's' : ''} for &ldquo;{q}&rdquo;</p>}
      </div>

      {!q || total === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={Search}
            title={q ? "No results found" : "Search your workspace"}
            description={q ? "Try a different search term." : "Search across projects, tasks, documents, and creative work."}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {results.projects.length > 0 && (
            <SearchSection title="Projects" icon={FolderKanban}>
              {results.projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between p-3 border-2 bg-surface hover:bg-hover transition-colors" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                  <span className="text-sm font-medium truncate">{p.name}</span>
                  <Badge>{p.status}</Badge>
                </Link>
              ))}
            </SearchSection>
          )}
          {results.tasks.length > 0 && (
            <SearchSection title="Tasks" icon={CheckSquare}>
              {results.tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 border-2 bg-surface" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-fg-muted">{t.project.name}</p>
                  </div>
                  <Badge>{t.status}</Badge>
                </div>
              ))}
            </SearchSection>
          )}
          {results.documents.length > 0 && (
            <SearchSection title="Documents" icon={FileText}>
              {results.documents.map((d) => (
                <Link key={d.id} href={`/documents/${d.id}`} className="flex items-center justify-between p-3 border-2 bg-surface hover:bg-hover transition-colors" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                  <span className="text-sm font-medium truncate">{d.title}</span>
                  <Badge>v{d.version}</Badge>
                </Link>
              ))}
            </SearchSection>
          )}
          {results.creations.length > 0 && (
            <SearchSection title="Creative" icon={Sparkles}>
              {results.creations.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 border-2 bg-surface" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                  <span className="text-sm font-medium truncate">{c.templateId}</span>
                  <Badge>{c.status}</Badge>
                </div>
              ))}
            </SearchSection>
          )}
        </div>
      )}
    </div>
  );
}

function SearchSection({ title, icon: Icon, children }: { title: string; icon: typeof Search; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="heading-display text-sm mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4" /> {title}
      </h2>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
