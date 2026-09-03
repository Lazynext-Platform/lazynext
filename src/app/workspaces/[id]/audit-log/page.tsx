import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { ScrollText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspace = await WorkspaceService.getForUser(id, session.user.id);
  if (!workspace) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p>Workspace not found.</p>
        <Link href="/workspaces" className="text-sm text-fg-secondary hover:text-fg">Back to workspaces</Link>
      </div>
    );
  }

  const events = await prisma.auditEvent.findMany({
    where: { workspaceId: id },
    include: { workspace: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href={`/workspaces/${id}`} className="flex items-center gap-1 text-sm text-fg-secondary hover:text-fg mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to workspace
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <ScrollText className="h-6 w-6" />
        <div>
          <h1 className="heading-display text-2xl">Audit Log</h1>
          <p className="text-sm text-fg-secondary">{workspace.name} · {events.length} event{events.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {events.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={ScrollText}
            title="No audit events yet"
            description="Security and activity events will appear here as they occur."
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2" style={{ borderColor: 'var(--c-ink)' }}>
                <th className="label-mono text-left px-4 py-3">Action</th>
                <th className="label-mono text-left px-4 py-3 hidden sm:table-cell">Target</th>
                <th className="label-mono text-left px-4 py-3 hidden md:table-cell">IP</th>
                <th className="label-mono text-left px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b-2 last:border-0 hover:bg-hover transition-colors" style={{ borderColor: 'var(--c-ink)' }}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">{e.action}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {e.targetType ? <Badge>{e.targetType}:{e.targetId?.slice(0, 8)}</Badge> : <span className="text-fg-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-fg-secondary font-mono text-xs">{e.ip || '—'}</td>
                  <td className="px-4 py-3 text-fg-secondary">{new Date(e.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
