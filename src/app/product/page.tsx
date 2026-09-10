import type { Metadata } from 'next';
import { Lightbulb } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Product Management — Lazynext',
  description: 'Feature ideas, releases, and roadmap planning.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ProductManagementService } from '@/lib/services/product-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { ProductDashboard } from './ProductDashboard';

export const dynamic = 'force-dynamic';

export default async function ProductPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Product Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Feature ideas, releases, and roadmap planning.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Lightbulb}
            title="No workspace yet"
            description="Create a company first to start managing your product."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const [ideas, releases, roadmap, stats] = await Promise.all([
    ProductManagementService.FeatureIdea.list(organizationId),
    ProductManagementService.Release.list(organizationId),
    ProductManagementService.Roadmap.list(organizationId),
    ProductManagementService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Product Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Feature ideas, releases, and roadmap planning.</p>
      </div>

      <ProductDashboard
        organizationId={organizationId}
        ideas={ideas}
        releases={releases}
        roadmap={roadmap}
        stats={stats}
      />
    </div>
  );
}
