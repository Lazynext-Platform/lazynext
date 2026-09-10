import type { Metadata } from 'next';
import { Package } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Asset Tracking — Lazynext',
  description: 'Track assets, assignments, depreciation, and audits across the organization.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AssetTrackingService } from '@/lib/services/asset-tracking-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { AssetTrackingDashboard } from './AssetTrackingDashboard';

export const dynamic = 'force-dynamic';

export default async function AssetTrackingPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Asset Tracking</h1>
          <p className="text-sm text-fg-secondary mt-1">Track assets, assignments, depreciation, and audits across the organization.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Package}
            title="No workspace yet"
            description="Create a company first to access asset tracking."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const workspaceId = workspaces[0].id;

  const [assets, assignments, depreciations, audits, metrics, stats] = await Promise.all([
    AssetTrackingService.listAssets(organizationId),
    AssetTrackingService.listAssignments(organizationId),
    AssetTrackingService.listDepreciations(organizationId),
    AssetTrackingService.listAudits(organizationId),
    AssetTrackingService.getAssetTrackingMetrics(organizationId),
    AssetTrackingService.getAssetTrackingStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Asset Tracking</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Track assets, assignments, depreciation, and audits across the organization.</p>
      </div>

      <AssetTrackingDashboard
        organizationId={organizationId}
        workspaceId={workspaceId}
        assets={assets}
        assignments={assignments}
        depreciations={depreciations}
        audits={audits}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
