import Link from 'next/link';
import { Building, Plus, ArrowRight } from 'lucide-react';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function WorkspacesPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  // Ensure user has at least one workspace
  await WorkspaceService.ensureDefaultWorkspace(session.user.id, session.user.name);
  const workspaces = await WorkspaceService.listForUser(session.user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-display text-2xl">Workspaces</h1>
          <p className="text-sm text-fg-secondary mt-1">{workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {workspaces.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={Building}
            title="No workspaces"
            description="Create your first workspace to get started."
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {workspaces.map((ws) => (
            <Link key={ws.id} href={`/workspaces/${ws.id}/settings`}>
              <Card className="p-5 flex items-center gap-4 transition-all hover:translate-x-[2px] hover:translate-y-[2px]">
                <div
                  className="flex h-12 w-12 items-center justify-center border-2 font-display text-lg font-black shrink-0"
                  style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-accent)', color: 'var(--c-accent-fg)', borderRadius: 'var(--radius-md)' }}
                >
                  {ws.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{ws.name}</p>
                  <p className="text-xs text-fg-muted">{ws.slug}</p>
                </div>
                <Badge variant={ws.role === 'owner' ? 'accent' : 'default'}>{ws.role}</Badge>
                <ArrowRight className="h-4 w-4 text-fg-muted shrink-0" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
