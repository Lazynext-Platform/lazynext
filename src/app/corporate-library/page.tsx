import type { Metadata } from 'next';
import { BookOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Corporate Library — Lazynext',
  description: 'Manage library items, loans, reservations, and acquisitions.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CorporateLibraryService } from '@/lib/services/corporate-library-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { CorporateLibraryDashboard } from './CorporateLibraryDashboard';

export const dynamic = 'force-dynamic';

export default async function CorporateLibraryPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Corporate Library</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage library items, loans, reservations, and acquisitions.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={BookOpen}
            title="No workspace yet"
            description="Create a company first to access the corporate library."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [items, loans, reservations, acquisitions, metrics, stats] = await Promise.all([
    CorporateLibraryService.listItems(organizationId),
    CorporateLibraryService.listLoans(organizationId),
    CorporateLibraryService.listReservations(organizationId),
    CorporateLibraryService.listAcquisitions(organizationId),
    CorporateLibraryService.getCorporateLibraryMetrics(organizationId),
    CorporateLibraryService.getCorporateLibraryStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Corporate Library</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage library items, loans, reservations, and acquisitions.</p>
      </div>

      <CorporateLibraryDashboard
        organizationId={organizationId}
        items={items}
        loans={loans}
        reservations={reservations}
        acquisitions={acquisitions}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
