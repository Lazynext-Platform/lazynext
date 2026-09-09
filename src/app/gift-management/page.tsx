import type { Metadata } from 'next';
import { Gift } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Gift Management — Lazynext',
  description: 'Manage gift items, recipients, orders, and inventory.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GiftManagementService } from '@/lib/services/gift-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { GiftManagementDashboard } from './GiftManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function GiftManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Gift Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage gift items, recipients, orders, and inventory.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Gift}
            title="No workspace yet"
            description="Create a company first to access gift management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const workspaceId = workspaces[0].id;

  const [items, recipients, orders, inventory, metrics, stats] = await Promise.all([
    GiftManagementService.listItems(organizationId),
    GiftManagementService.listRecipients(organizationId),
    GiftManagementService.listOrders(organizationId),
    GiftManagementService.listInventory(organizationId),
    GiftManagementService.getGiftManagementMetrics(organizationId),
    GiftManagementService.getGiftManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Gift className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Gift Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage gift items, recipients, orders, and inventory.</p>
      </div>

      <GiftManagementDashboard
        organizationId={organizationId}
        workspaceId={workspaceId}
        items={items}
        recipients={recipients}
        orders={orders}
        inventory={inventory}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
