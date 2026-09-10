import type { Metadata } from 'next';
import { Printer } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Print Services — Lazynext',
  description: 'Manage print jobs, printers, supplies, and maintenance.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PrintServicesService } from '@/lib/services/print-services-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { PrintServicesDashboard } from './PrintServicesDashboard';

export const dynamic = 'force-dynamic';

export default async function PrintServicesPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Print Services</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage print jobs, printers, supplies, and maintenance.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Printer}
            title="No workspace yet"
            description="Create a company first to access print services."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [jobs, printers, supplies, maintenance, metrics, stats] = await Promise.all([
    PrintServicesService.listJobs(organizationId),
    PrintServicesService.listPrinters(organizationId),
    PrintServicesService.listSupplies(organizationId),
    PrintServicesService.listMaintenance(organizationId),
    PrintServicesService.getPrintServicesMetrics(organizationId),
    PrintServicesService.getPrintServicesStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Printer className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Print Services</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage print jobs, printers, supplies, and maintenance.</p>
      </div>

      <PrintServicesDashboard
        organizationId={organizationId}
        jobs={jobs}
        printers={printers}
        supplies={supplies}
        maintenance={maintenance}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
