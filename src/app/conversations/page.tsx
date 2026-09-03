import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ConversationsClient } from '@/components/conversations/ConversationsClient';

export const dynamic = 'force-dynamic';

export default async function ConversationsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-fg-secondary">Please sign in to view conversations.</p>
      </div>
    );
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const workspaceList = workspaces.map((w) => ({ id: w.id, name: w.name }));
  const initialWorkspaceId = workspaceList[0]?.id || null;

  return (
    <ConversationsClient
      currentUserId={session.user.id}
      initialWorkspaceId={initialWorkspaceId}
      workspaces={workspaceList}
    />
  );
}
