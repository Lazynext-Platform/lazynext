import type { Metadata } from 'next';
import { Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Visitor Management — Lazynext',
  description: 'Manage visitor registration, check-in/check-out, access badges, hosts, and access logs.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VisitorManagementService } from '@/lib/services/visitor-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { VisitorManagementDashboard } from './VisitorManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function VisitorManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Visitor Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage visitor registration, check-in/check-out, access badges, hosts, and access logs.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Users}
            title="No workspace yet"
            description="Create a company first to access visitor management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [visits, badges, hosts, accessLogs, metrics, stats] = await Promise.all([
    VisitorManagementService.listVisits(organizationId),
    VisitorManagementService.listBadges(organizationId),
    VisitorManagementService.listHosts(organizationId),
    VisitorManagementService.listAccessLogs(organizationId),
    VisitorManagementService.getVisitorManagementMetrics(organizationId),
    VisitorManagementService.getVisitorManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Visitor Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage visitor registration, check-in/check-out, access badges, hosts, and access logs.</p>
      </div>

      <VisitorManagementDashboard
        organizationId={organizationId}
        visits={visits}
        badges={badges}
        hosts={hosts}
        accessLogs={accessLogs}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
