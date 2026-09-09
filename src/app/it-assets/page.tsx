import type { Metadata } from 'next';
import { Monitor } from 'lucide-react';

export const metadata: Metadata = {
  title: 'IT Asset Management — Lazynext',
  description: 'Track hardware, software, licenses, procurement, and contracts.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ITAssetService } from '@/lib/services/it-asset-service';
import { ITProcurementService } from '@/lib/services/it-procurement-service';
import { ITContractService } from '@/lib/services/it-contract-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { ITAssetDashboard } from './ITAssetDashboard';

export const dynamic = 'force-dynamic';

export default async function ITAssetsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">IT Asset Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Track hardware, software, licenses, procurement, and contracts.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Monitor}
            title="No workspace yet"
            description="Create a company first to start managing IT assets."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const [assets, procurement, contracts, expiringLicenses, expiringContracts, assetStats, contractStats] = await Promise.all([
    ITAssetService.list(organizationId),
    ITProcurementService.list(organizationId),
    ITContractService.list(organizationId),
    ITAssetService.getExpiringLicenses(organizationId, 30),
    ITContractService.getExpiringContracts(organizationId, 30),
    ITAssetService.getStats(organizationId),
    ITContractService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Monitor className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">IT Asset Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Track hardware, software, licenses, procurement, and contracts.</p>
      </div>

      <ITAssetDashboard
        organizationId={organizationId}
        assets={assets}
        procurement={procurement}
        contracts={contracts}
        expiringLicenses={expiringLicenses}
        expiringContracts={expiringContracts}
        assetStats={assetStats}
        contractStats={contractStats}
      />
    </div>
  );
}
