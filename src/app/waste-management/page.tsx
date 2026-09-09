import type { Metadata } from 'next';
import { Trash2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Waste Management — Lazynext',
  description: 'Manage waste streams, recycling programs, disposal records, and waste vendors.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { WasteManagementService } from '@/lib/services/waste-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { WasteManagementDashboard } from './WasteManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function WasteManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Waste Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage waste streams, recycling programs, disposal records, and waste vendors.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Trash2}
            title="No workspace yet"
            description="Create a company first to access waste management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [streams, programs, disposals, vendors, metrics, stats] = await Promise.all([
    WasteManagementService.listWasteStreams(organizationId),
    WasteManagementService.listRecyclingPrograms(organizationId),
    WasteManagementService.listWasteDisposals(organizationId),
    WasteManagementService.listWasteVendors(organizationId),
    WasteManagementService.getWasteManagementMetrics(organizationId),
    WasteManagementService.getWasteManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Trash2 className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Waste Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage waste streams, recycling programs, disposal records, and waste vendors.</p>
      </div>

      <WasteManagementDashboard
        organizationId={organizationId}
        streams={streams}
        programs={programs}
        disposals={disposals}
        vendors={vendors}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
