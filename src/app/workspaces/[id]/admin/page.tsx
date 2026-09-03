import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { Card, Button, Badge } from '@/components/ui';
import { WorkspaceAdmin } from '@/components/WorkspaceAdmin';
import { Shield, Settings, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function WorkspaceAdminPage({ params }: { params: Promise<{ id: string }> }) {
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
        <Link href="/workspaces" className="text-sm text-fg-secondary hover:text-fg">← Back to workspaces</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href={`/workspaces/${id}`} className="flex items-center gap-1 text-sm text-fg-secondary hover:text-fg mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to workspace
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div
          className="flex h-10 w-10 items-center justify-center border-2"
          style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
        >
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="heading-display text-2xl">Workspace Admin</h1>
          <p className="text-sm text-fg-secondary">{workspace.name} · You are <Badge>{workspace.role}</Badge></p>
        </div>
      </div>

      {/* Workspace settings */}
      <Card className="p-6 mb-6">
        <h2 className="heading-display text-lg mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5" /> Workspace details
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="label-mono text-xs mb-1">Name</p>
            <p className="font-semibold">{workspace.name}</p>
          </div>
          <div>
            <p className="label-mono text-xs mb-1">Slug</p>
            <p className="font-mono text-fg-secondary">{workspace.slug}</p>
          </div>
          <div>
            <p className="label-mono text-xs mb-1">Default locale</p>
            <p className="font-semibold">{workspace.defaultLocale}</p>
          </div>
          <div>
            <p className="label-mono text-xs mb-1">Timezone</p>
            <p className="font-semibold">{workspace.timezone}</p>
          </div>
          <div>
            <p className="label-mono text-xs mb-1">Members</p>
            <p className="font-semibold">{workspace.memberCount}</p>
          </div>
          <div>
            <p className="label-mono text-xs mb-1">Projects</p>
            <p className="font-semibold">{workspace.projectCount}</p>
          </div>
        </div>
      </Card>

      {/* Member management */}
      <WorkspaceAdmin workspaceId={id} currentRole={workspace.role} />
    </div>
  );
}
