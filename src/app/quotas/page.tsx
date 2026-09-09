import type { Metadata } from 'next';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { QuotaService } from '@/lib/services/quota';
import { Button } from '@/components/ui';
import { QuotaDashboard } from './QuotaDashboard';

export const metadata: Metadata = {
  title: 'Quotas — Lazynext',
  description: 'View and manage workspace resource quotas and usage.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function QuotasPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Quotas</h1>
          <p className="text-sm text-fg-secondary mt-1">View and manage workspace resource quotas and usage.</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-fg-secondary">No workspaces yet. Create a workspace to start tracking quotas.</p>
          <div className="mt-4">
            <Button href="/dashboard">Go to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  const workspaceId = workspaces[0].id;
  const summary = await QuotaService.getUsageSummary(workspaceId);

  if (!summary) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Quotas</h1>
          <p className="text-sm text-fg-secondary mt-1">View and manage workspace resource quotas and usage.</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-fg-secondary">Failed to load quota data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl">Quotas</h1>
        <p className="text-sm text-fg-secondary mt-1">View and manage workspace resource quotas and usage.</p>
      </div>
      <QuotaDashboard summary={summary} workspaceId={workspaceId} />
    </div>
  );
}
