import type { Metadata } from 'next';
import { BarChart3 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Custom Reporting — Lazynext',
  description: 'Build, execute, and export custom reports from your data.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ReportBuilderService } from '@/lib/services/report-builder-service';
import { ReportTemplateService } from '@/lib/services/report-template-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { ReportDashboard } from './ReportDashboard';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Custom Reporting</h1>
          <p className="text-sm text-fg-secondary mt-1">Build, execute, and export custom reports from your data.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={BarChart3}
            title="No workspace yet"
            description="Create a company first to access custom reporting."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [reports, templates, stats] = await Promise.all([
    ReportBuilderService.list(organizationId),
    ReportTemplateService.list(organizationId),
    ReportBuilderService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Custom Reporting</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Build, execute, and export custom reports from your data.</p>
      </div>

      <ReportDashboard
        organizationId={organizationId}
        initialReports={reports}
        initialTemplates={templates}
        initialStats={stats}
      />
    </div>
  );
}
