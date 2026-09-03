import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { Card, Button } from '@/components/ui';
import { Plug, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { IntegrationsManager } from '@/components/IntegrationsManager';

export const dynamic = 'force-dynamic';

export default async function WorkspaceIntegrationsPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Fetch existing connections
  const connections = await prisma.platformConnection.findMany({
    where: { userId: session.user.id },
    select: { id: true, platform: true, platformUsername: true, createdAt: true },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href={`/workspaces/${id}`} className="flex items-center gap-1 text-sm text-fg-secondary hover:text-fg mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to workspace
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <Plug className="h-6 w-6" />
        <div>
          <h1 className="heading-display text-2xl">Integrations</h1>
          <p className="text-sm text-fg-secondary">{workspace.name}</p>
        </div>
      </div>

      <IntegrationsManager initialConnections={connections.map((c) => ({ id: c.id, platform: c.platform, platformUsername: c.platformUsername }))} />
    </div>
  );
}
