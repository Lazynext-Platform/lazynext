import type { Metadata } from 'next';
import { FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Patent Management — Lazynext',
  description: 'Manage patent applications, documents, licenses, and maintenance fees.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PatentManagementService } from '@/lib/services/patent-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { PatentManagementDashboard } from './PatentManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function PatentManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Patent Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage patent applications, documents, licenses, and maintenance fees.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={FileText}
            title="No workspace yet"
            description="Create a company first to access patent management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [applications, documents, licenses, maintenance, metrics, stats] = await Promise.all([
    PatentManagementService.listApplications(organizationId),
    PatentManagementService.listDocuments(organizationId),
    PatentManagementService.listLicenses(organizationId),
    PatentManagementService.listMaintenance(organizationId),
    PatentManagementService.getPatentManagementMetrics(organizationId),
    PatentManagementService.getPatentManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Patent Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage patent applications, documents, licenses, and maintenance fees.</p>
      </div>

      <PatentManagementDashboard
        organizationId={organizationId}
        applications={applications}
        documents={documents}
        licenses={licenses}
        maintenance={maintenance}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
