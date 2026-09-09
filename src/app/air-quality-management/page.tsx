import type { Metadata } from 'next';
import { Wind } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Air Quality Management — Lazynext',
  description: 'Manage air quality sensors, readings, thresholds, and alerts.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AirQualityManagementService } from '@/lib/services/air-quality-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { AirQualityManagementDashboard } from './AirQualityManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function AirQualityManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Air Quality Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage air quality sensors, readings, thresholds, and alerts.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Wind}
            title="No workspace yet"
            description="Create a company first to access air quality management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [sensors, readings, thresholds, alerts, metrics, stats] = await Promise.all([
    AirQualityManagementService.listAirSensors(organizationId),
    AirQualityManagementService.listAirReadings(organizationId),
    AirQualityManagementService.listAirThresholds(organizationId),
    AirQualityManagementService.listAirAlerts(organizationId),
    AirQualityManagementService.getAirQualityManagementMetrics(organizationId),
    AirQualityManagementService.getAirQualityManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Wind className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Air Quality Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage air quality sensors, readings, thresholds, and alerts.</p>
      </div>

      <AirQualityManagementDashboard
        organizationId={organizationId}
        sensors={sensors}
        readings={readings}
        thresholds={thresholds}
        alerts={alerts}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
