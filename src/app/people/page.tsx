import Link from 'next/link';
import { Users, UserPlus, Mail } from 'lucide-react';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function PeoplePage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  // Gather members across all workspaces
  const allMembers = await Promise.all(
    workspaces.map((ws) => WorkspaceService.listMembers(ws.id, session.user.id).catch(() => [])),
  );

  // Flatten and deduplicate by user ID
  const seen = new Set<string>();
  const members = allMembers
    .flat()
    .filter((m) => {
      if (seen.has(m.user.id)) return false;
      seen.add(m.user.id);
      return true;
    });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-display text-2xl">People</h1>
          <p className="text-sm text-fg-secondary mt-1">{members.length} member{members.length !== 1 ? 's' : ''} across your workspaces</p>
        </div>
      </div>

      {members.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={Users}
            title="No members yet"
            description="Invite team members to your workspace to collaborate."
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <Card key={m.id} className="p-4 flex items-center gap-4">
              {m.user.image ? (
                <img src={m.user.image} alt="" className="h-12 w-12 rounded-[var(--radius-md)] border-2" style={{ borderColor: 'var(--c-ink)' }} />
              ) : (
                <span
                  className="flex h-12 w-12 items-center justify-center text-lg font-bold border-2"
                  style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-md)' }}
                >
                  {(m.user.name || m.user.email || '?')[0]?.toUpperCase()}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{m.user.name || 'User'}</p>
                <p className="text-xs text-fg-muted truncate flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {m.user.email}
                </p>
              </div>
              <Badge variant={m.role === 'owner' ? 'accent' : m.role === 'admin' ? 'info' : 'default'}>{m.role}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
