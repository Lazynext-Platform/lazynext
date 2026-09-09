import type { Metadata } from 'next';
import { Copyright } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Intellectual Property — Lazynext',
  description: 'Manage IP assets, licenses, disputes, trademarks, and trade secrets.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { IPService } from '@/lib/services/ip-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { IPDashboard } from './IPDashboard';

export const dynamic = 'force-dynamic';

export default async function IPPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Intellectual Property</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage IP assets, licenses, disputes, trademarks, and trade secrets.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Copyright}
            title="No workspace yet"
            description="Create a company first to access intellectual property management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const workspaceId = workspaces[0].id;

  const [assets, licenses, disputes, trademarks, tradeSecrets, metrics, stats] = await Promise.all([
    IPService.listAssets(organizationId),
    IPService.listLicenses(organizationId),
    IPService.listDisputes(organizationId),
    IPService.listTrademarks(organizationId),
    IPService.listTradeSecrets(organizationId),
    IPService.getIPMetrics(organizationId),
    IPService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Copyright className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Intellectual Property</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage IP assets, licenses, disputes, trademarks, and trade secrets.</p>
      </div>

      <IPDashboard
        organizationId={organizationId}
        workspaceId={workspaceId}
        assets={assets}
        licenses={licenses}
        disputes={disputes}
        trademarks={trademarks}
        tradeSecrets={tradeSecrets}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
