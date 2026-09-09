import type { Metadata } from 'next';
import { Package } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Product Lifecycle — Lazynext',
  description: 'Manage products, lifecycle phases, versions, and end-of-life tracking.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ProductLifecycleService } from '@/lib/services/product-lifecycle-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { ProductLifecycleDashboard } from './ProductLifecycleDashboard';

export const dynamic = 'force-dynamic';

export default async function ProductLifecyclePage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Product Lifecycle</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage products, lifecycle phases, versions, and end-of-life tracking.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Package}
            title="No workspace yet"
            description="Create a company first to access product lifecycle management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [products, phases, versions, eols, metrics, stats] = await Promise.all([
    ProductLifecycleService.listProducts(organizationId),
    ProductLifecycleService.listPhases(organizationId),
    ProductLifecycleService.listVersions(organizationId),
    ProductLifecycleService.listEols(organizationId),
    ProductLifecycleService.getProductLifecycleMetrics(organizationId),
    ProductLifecycleService.getProductLifecycleStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Product Lifecycle</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage products, lifecycle phases, versions, and end-of-life tracking.</p>
      </div>

      <ProductLifecycleDashboard
        organizationId={organizationId}
        products={products}
        phases={phases}
        versions={versions}
        eols={eols}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
