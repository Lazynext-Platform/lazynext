import type { Metadata } from 'next';
import { Warehouse } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Inventory & Warehouse Management — Lazynext',
  description: 'Track warehouses, inventory items, stock movements, and valuations.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InventoryService } from '@/lib/services/inventory-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { InventoryDashboard } from './InventoryDashboard';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Inventory & Warehouse Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Track warehouses, inventory items, stock movements, and valuations.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Warehouse}
            title="No workspace yet"
            description="Create a company first to start managing inventory."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const [warehouses, items, movements, lowStock, valuation, summary, stats] = await Promise.all([
    InventoryService.listWarehouses(organizationId),
    InventoryService.listItems(organizationId),
    InventoryService.getMovements(organizationId),
    InventoryService.getLowStockItems(organizationId),
    InventoryService.getInventoryValuation(organizationId),
    InventoryService.getStockSummary(organizationId),
    InventoryService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Warehouse className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Inventory & Warehouse Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Track warehouses, inventory items, stock movements, and valuations.</p>
      </div>

      <InventoryDashboard
        organizationId={organizationId}
        warehouses={warehouses}
        items={items}
        movements={movements}
        lowStock={lowStock}
        valuation={valuation}
        summary={summary}
        stats={stats}
      />
    </div>
  );
}
