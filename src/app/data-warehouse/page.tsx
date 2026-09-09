import type { Metadata } from 'next';
import { Database } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Data Warehouse — Lazynext',
  description: 'Manage data pipelines, ETL jobs, data models, and data quality monitoring.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataWarehouseService } from '@/lib/services/data-warehouse-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { DataWarehouseDashboard } from './DataWarehouseDashboard';

export const dynamic = 'force-dynamic';

export default async function DataWarehousePage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Data Warehouse</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage data pipelines, ETL jobs, data models, and data quality monitoring.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Database}
            title="No workspace yet"
            description="Create a company first to access data warehouse management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [pipelines, jobs, models, qualities, metrics, stats] = await Promise.all([
    DataWarehouseService.listPipelines(organizationId),
    DataWarehouseService.listJobs(organizationId),
    DataWarehouseService.listModels(organizationId),
    DataWarehouseService.listQualities(organizationId),
    DataWarehouseService.getDataWarehouseMetrics(organizationId),
    DataWarehouseService.getDataWarehouseStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Data Warehouse</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage data pipelines, ETL jobs, data models, and data quality monitoring.</p>
      </div>

      <DataWarehouseDashboard
        organizationId={organizationId}
        pipelines={pipelines}
        jobs={jobs}
        models={models}
        qualities={qualities}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
