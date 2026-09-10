import type { Metadata } from 'next';
import { Briefcase } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Office Services — Lazynext',
  description: 'Manage office requests, mail, print jobs, and supplies.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OfficeServicesService } from '@/lib/services/office-services-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { OfficeServicesDashboard } from './OfficeServicesDashboard';

export const dynamic = 'force-dynamic';

export default async function OfficeServicesPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Office Services</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage office requests, mail, print jobs, and supplies.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Briefcase}
            title="No workspace yet"
            description="Create a company first to access office services management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [requests, mail, printJobs, supplies, metrics, stats] = await Promise.all([
    OfficeServicesService.listRequests(organizationId),
    OfficeServicesService.listMail(organizationId),
    OfficeServicesService.listPrintJobs(organizationId),
    OfficeServicesService.listSupplyOrders(organizationId),
    OfficeServicesService.getOfficeServicesMetrics(organizationId),
    OfficeServicesService.getOfficeServicesStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Office Services</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage office requests, mail, print jobs, and supplies.</p>
      </div>

      <OfficeServicesDashboard
        organizationId={organizationId}
        requests={requests}
        mail={mail}
        printJobs={printJobs}
        supplies={supplies}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
