import type { Metadata } from 'next';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AlertService } from '@/lib/services/alert-service';
import { SLOService } from '@/lib/services/slo-service';
import { TraceService } from '@/lib/services/trace-service';
import { RetentionService } from '@/lib/services/retention-service';
import { TelemetryService } from '@/lib/services/telemetry';
import { Button, EmptyState } from '@/components/ui';
import { Activity } from 'lucide-react';
import { ObservabilityDashboard } from './ObservabilityDashboard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Observability v2 — Lazynext',
  description: 'Durable time-series telemetry, alerts, SLOs, traces, and retention policies.',
  robots: { index: false, follow: false },
};

export default async function ObservabilityV2Page() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Observability v2</h1>
          <p className="text-sm text-fg-secondary mt-1">
            Durable time-series telemetry, alerts, SLOs, traces, and retention policies.
          </p>
        </div>
        <EmptyState
          icon={Activity}
          title="No workspace yet"
          description="Create a company first to start using observability."
          action={<Button href="/company/new">Create Company</Button>}
        />
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [alertSummary, sloSummary, traceStats, retentionSummary, recentAlerts, slos, recentTraces, metricNames] =
    await Promise.all([
      AlertService.getAlertSummary(organizationId),
      SLOService.getSLOSummary(organizationId),
      TraceService.getTraceStats(organizationId),
      RetentionService.getRetentionSummary(organizationId),
      AlertService.listAlerts(organizationId, { limit: 10 }),
      SLOService.listSLOs(organizationId),
      TraceService.listTraces(organizationId, { limit: 10 }),
      TelemetryService.getMetricNames(organizationId),
    ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl">Observability v2</h1>
        <p className="text-sm text-fg-secondary mt-1">
          Durable time-series telemetry, alerts, SLOs, traces, and retention policies.
        </p>
      </div>
      <ObservabilityDashboard
        alertSummary={JSON.parse(JSON.stringify(alertSummary))}
        sloSummary={JSON.parse(JSON.stringify(sloSummary))}
        traceStats={JSON.parse(JSON.stringify(traceStats))}
        retentionSummary={JSON.parse(JSON.stringify(retentionSummary))}
        recentAlerts={JSON.parse(JSON.stringify(recentAlerts))}
        slos={JSON.parse(JSON.stringify(slos))}
        recentTraces={JSON.parse(JSON.stringify(recentTraces))}
        metricNames={metricNames}
      />
    </div>
  );
}
