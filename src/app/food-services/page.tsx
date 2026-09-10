import type { Metadata } from 'next';
import { UtensilsCrossed } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Food Services — Lazynext',
  description: 'Manage cafeteria menus, catering orders, meal plans, vendors, and inventory.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FoodServicesService } from '@/lib/services/food-services-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { FoodServicesDashboard } from './FoodServicesDashboard';

export const dynamic = 'force-dynamic';

export default async function FoodServicesPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Food Services</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage cafeteria menus, catering orders, meal plans, vendors, and inventory.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={UtensilsCrossed}
            title="No workspace yet"
            description="Create a company first to access food services."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [menus, orders, vendors, inventory, metrics, stats] = await Promise.all([
    FoodServicesService.listMenus(organizationId),
    FoodServicesService.listOrders(organizationId),
    FoodServicesService.listVendors(organizationId),
    FoodServicesService.listInventory(organizationId),
    FoodServicesService.getFoodServicesMetrics(organizationId),
    FoodServicesService.getFoodServicesStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Food Services</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage cafeteria menus, catering orders, meal plans, vendors, and inventory.</p>
      </div>

      <FoodServicesDashboard
        organizationId={organizationId}
        menus={menus}
        orders={orders}
        vendors={vendors}
        inventory={inventory}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
