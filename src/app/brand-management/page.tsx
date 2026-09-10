import type { Metadata } from 'next';
import { BadgeCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Brand Management — Lazynext',
  description: 'Manage brand guidelines, assets, audits, and consistency tracking.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BrandManagementService } from '@/lib/services/brand-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { BrandManagementDashboard } from './BrandManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function BrandManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Brand Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage brand guidelines, assets, audits, and consistency tracking.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={BadgeCheck}
            title="No workspace yet"
            description="Create a company first to access brand management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [guidelines, assets, audits, consistencies, metrics, stats] = await Promise.all([
    BrandManagementService.listGuidelines(organizationId),
    BrandManagementService.listAssets(organizationId),
    BrandManagementService.listAudits(organizationId),
    BrandManagementService.listConsistencies(organizationId),
    BrandManagementService.getBrandManagementMetrics(organizationId),
    BrandManagementService.getBrandManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <BadgeCheck className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Brand Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage brand guidelines, assets, audits, and consistency tracking.</p>
      </div>

      <BrandManagementDashboard
        organizationId={organizationId}
        guidelines={guidelines}
        assets={assets}
        audits={audits}
        consistencies={consistencies}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
