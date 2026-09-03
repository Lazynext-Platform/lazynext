import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { Button } from '@/components/ui';
import { Settings, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { WorkspaceSettingsForm } from '@/components/WorkspaceSettingsForm';

export const dynamic = 'force-dynamic';

export default async function WorkspaceSettingsPage({ params }: { params: Promise<{ id: string }> }) {
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

  const canEdit = workspace.role === 'owner' || workspace.role === 'admin';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href={`/workspaces/${id}`} className="flex items-center gap-1 text-sm text-fg-secondary hover:text-fg mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to workspace
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-6 w-6" />
        <h1 className="heading-display text-2xl">General Settings</h1>
      </div>

      {canEdit ? (
        <WorkspaceSettingsForm
          workspaceId={id}
          initialName={workspace.name}
          initialLocale={workspace.defaultLocale}
          initialTimezone={workspace.timezone}
        />
      ) : (
        <div className="p-6 border-2 text-sm text-fg-secondary" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
          Only owners and admins can edit workspace settings.
        </div>
      )}
    </div>
  );
}
