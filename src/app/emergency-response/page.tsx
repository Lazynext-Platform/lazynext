import type { Metadata } from 'next';
import { Siren } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Emergency Response Management — Lazynext',
  description: 'Manage emergency plans, drills, evacuation routes, and emergency contacts.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmergencyResponseService } from '@/lib/services/emergency-response-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { EmergencyResponseDashboard } from './EmergencyResponseDashboard';

export const dynamic = 'force-dynamic';

export default async function EmergencyResponsePage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Emergency Response</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage emergency plans, drills, evacuation routes, and emergency contacts.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Siren}
            title="No workspace yet"
            description="Create a company first to access emergency response."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [plans, drills, routes, contacts, metrics, stats] = await Promise.all([
    EmergencyResponseService.listEmergencyPlans(organizationId),
    EmergencyResponseService.listEmergencyDrills(organizationId),
    EmergencyResponseService.listEvacuationRoutes(organizationId),
    EmergencyResponseService.listEmergencyContacts(organizationId),
    EmergencyResponseService.getEmergencyResponseMetrics(organizationId),
    EmergencyResponseService.getEmergencyResponseStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Siren className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Emergency Response</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage emergency plans, drills, evacuation routes, and emergency contacts.</p>
      </div>

      <EmergencyResponseDashboard
        organizationId={organizationId}
        plans={plans}
        drills={drills}
        routes={routes}
        contacts={contacts}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
