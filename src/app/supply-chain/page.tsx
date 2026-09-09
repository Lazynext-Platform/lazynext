import type { Metadata } from 'next';
import { Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Supply Chain — Lazynext',
  description: 'Manage suppliers, shipments, logistics orders, and supplier risks.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SupplyChainService } from '@/lib/services/supply-chain-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { SupplyChainDashboard } from './SupplyChainDashboard';

export const dynamic = 'force-dynamic';

export default async function SupplyChainPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Supply Chain Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage suppliers, shipments, logistics orders, and supplier risks.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Truck}
            title="No workspace yet"
            description="Create a company first to access supply chain management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [suppliers, shipments, logisticsOrders, risks, metrics, stats] = await Promise.all([
    SupplyChainService.listSuppliers(organizationId),
    SupplyChainService.listShipments(organizationId),
    SupplyChainService.listLogisticsOrders(organizationId),
    SupplyChainService.listSupplierRisks(organizationId),
    SupplyChainService.getSupplyChainMetrics(organizationId),
    SupplyChainService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Supply Chain Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage suppliers, shipments, logistics orders, and supplier risks.</p>
      </div>

      <SupplyChainDashboard
        organizationId={organizationId}
        suppliers={suppliers}
        shipments={shipments}
        logisticsOrders={logisticsOrders}
        risks={risks}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
