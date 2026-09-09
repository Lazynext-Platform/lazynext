import type { Metadata } from 'next';
import { Package } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Relocation Services — Lazynext',
  description: 'Manage employee relocation cases, moves, expenses, and vendor coordination.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RelocationService } from '@/lib/services/relocation-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { RelocationDashboard } from './RelocationDashboard';

export const dynamic = 'force-dynamic';

export default async function RelocationPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Relocation Services</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage employee relocation cases, moves, expenses, and vendor coordination.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Package}
            title="No workspace yet"
            description="Create a company first to access relocation services."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [cases, moves, expenses, vendors, metrics, stats] = await Promise.all([
    RelocationService.listCases(organizationId),
    RelocationService.listMoves(organizationId),
    RelocationService.listExpenses(organizationId),
    RelocationService.listVendors(organizationId),
    RelocationService.getRelocationMetrics(organizationId),
    RelocationService.getRelocationStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Relocation Services</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage employee relocation cases, moves, expenses, and vendor coordination.</p>
      </div>

      <RelocationDashboard
        organizationId={organizationId}
        cases={cases}
        moves={moves}
        expenses={expenses}
        vendors={vendors}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
