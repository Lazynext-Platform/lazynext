import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'New Agent — Lazynext',
  description: 'Create a new AI agent for your workspace.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { Button } from '@/components/ui';
import { NewAgentForm } from './NewAgentForm';

export const dynamic = 'force-dynamic';

export default async function NewAgentPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">New Agent</h1>
          <p className="text-sm text-fg-secondary mt-1">Create a company first, then set up your AI agents.</p>
        </div>
        <Button href="/company/new">Create Company</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl">New Agent</h1>
        <p className="text-sm text-fg-secondary mt-1">Create a new AI agent for your workspace.</p>
      </div>
      <NewAgentForm
        workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))}
        defaultWorkspaceId={workspaces[0].id}
      />
    </div>
  );
}
