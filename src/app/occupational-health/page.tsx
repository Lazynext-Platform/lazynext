import type { Metadata } from 'next';
import { HeartPulse } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Occupational Health — Lazynext',
  description: 'Manage medical surveillance, examinations, health exposures, and vaccination records.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OccupationalHealthService } from '@/lib/services/occupational-health-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { OccupationalHealthDashboard } from './OccupationalHealthDashboard';

export const dynamic = 'force-dynamic';

export default async function OccupationalHealthPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Occupational Health</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage medical surveillance, examinations, health exposures, and vaccination records.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={HeartPulse}
            title="No workspace yet"
            description="Create a company first to access occupational health."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [surveillances, exams, exposures, vaccinations, metrics, stats] = await Promise.all([
    OccupationalHealthService.listMedicalSurveillances(organizationId),
    OccupationalHealthService.listMedicalExams(organizationId),
    OccupationalHealthService.listHealthExposures(organizationId),
    OccupationalHealthService.listVaccinationRecords(organizationId),
    OccupationalHealthService.getOccupationalHealthMetrics(organizationId),
    OccupationalHealthService.getOccupationalHealthStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Occupational Health</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage medical surveillance, examinations, health exposures, and vaccination records.</p>
      </div>

      <OccupationalHealthDashboard
        organizationId={organizationId}
        surveillances={surveillances}
        exams={exams}
        exposures={exposures}
        vaccinations={vaccinations}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
