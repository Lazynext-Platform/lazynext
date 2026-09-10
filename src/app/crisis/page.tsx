import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Crisis Management — Lazynext',
  description: 'Manage crisis plans, incidents, contacts, and drills.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CrisisService } from '@/lib/services/crisis-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { CrisisDashboard } from './CrisisDashboard';

export const dynamic = 'force-dynamic';

export default async function CrisisPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Crisis Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage crisis plans, incidents, contacts, and drills.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={AlertTriangle}
            title="No workspace yet"
            description="Create a company first to access crisis management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [plans, incidents, contacts, drills, metrics, stats] = await Promise.all([
    CrisisService.listPlans(organizationId),
    CrisisService.listIncidents(organizationId),
    CrisisService.listContacts(organizationId),
    CrisisService.listDrills(organizationId),
    CrisisService.getCrisisMetrics(organizationId),
    CrisisService.getCrisisStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Crisis Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage crisis plans, incidents, contacts, and drills.</p>
      </div>

      <CrisisDashboard
        organizationId={organizationId}
        plans={plans}
        incidents={incidents}
        contacts={contacts}
        drills={drills}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
