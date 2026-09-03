import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { Card, Badge, Button } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function WorkspaceMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) notFound();

  const detail = await WorkspaceService.getForUser(id, session.user.id);
  if (!detail) notFound();

  const members = await WorkspaceService.listMembers(id, session.user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href={`/workspaces/${id}`} className="flex items-center gap-1 text-sm text-fg-secondary hover:text-fg mb-4">
        <ArrowLeft className="h-4 w-4" /> Workspace settings
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-display text-2xl">Members</h1>
          <p className="text-sm text-fg-secondary mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        {['owner', 'admin'].includes(detail.role) && (
          <Button>
            <UserPlus className="h-4 w-4" /> Invite
          </Button>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2" style={{ borderColor: 'var(--c-ink)' }}>
              <th className="label-mono text-left px-4 py-3">User</th>
              <th className="label-mono text-left px-4 py-3">Role</th>
              <th className="label-mono text-left px-4 py-3 hidden sm:table-cell">Joined</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b-2 last:border-0" style={{ borderColor: 'var(--c-ink)' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {m.user.image ? (
                      <img src={m.user.image} alt="" className="h-8 w-8 rounded-[var(--radius-sm)]" />
                    ) : (
                      <span
                        className="flex h-8 w-8 items-center justify-center text-xs font-bold border-2"
                        style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
                      >
                        {(m.user.name || m.user.email || '?')[0]?.toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{m.user.name || 'User'}</p>
                      <p className="text-xs text-fg-muted truncate">{m.user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={m.role === 'owner' ? 'accent' : m.role === 'admin' ? 'info' : 'default'}>{m.role}</Badge>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-fg-secondary">
                  {new Date(m.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
