import type { Metadata } from 'next';
import { Ship } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Import/Export — Lazynext',
  description: 'Manage shipments, customs declarations, trade licenses, and tariff records.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ImportExportService } from '@/lib/services/import-export-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { ImportExportDashboard } from './ImportExportDashboard';

export const dynamic = 'force-dynamic';

export default async function ImportExportPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Import/Export</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage shipments, customs declarations, trade licenses, and tariff records.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Ship}
            title="No workspace yet"
            description="Create a company first to access import/export management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [shipments, declarations, licenses, tariffs, metrics, stats] = await Promise.all([
    ImportExportService.listShipments(organizationId),
    ImportExportService.listDeclarations(organizationId),
    ImportExportService.listLicenses(organizationId),
    ImportExportService.listTariffs(organizationId),
    ImportExportService.getImportExportMetrics(organizationId),
    ImportExportService.getImportExportStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Ship className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Import/Export</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage shipments, customs declarations, trade licenses, and tariff records.</p>
      </div>

      <ImportExportDashboard
        organizationId={organizationId}
        shipments={shipments}
        declarations={declarations}
        licenses={licenses}
        tariffs={tariffs}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
