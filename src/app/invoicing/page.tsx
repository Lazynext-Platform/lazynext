import type { Metadata } from 'next';
import { Receipt } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Invoicing & AR/AP — Lazynext',
  description: 'Manage invoices, accounts receivable, and accounts payable.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InvoiceService } from '@/lib/services/invoice-service';
import { ARService } from '@/lib/services/ar-service';
import { APService } from '@/lib/services/ap-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { InvoicingDashboard } from './InvoicingDashboard';

export const dynamic = 'force-dynamic';

export default async function InvoicingPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Invoicing & AR/AP</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage invoices, accounts receivable, and accounts payable.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Receipt}
            title="No workspace yet"
            description="Create a company first to access invoicing."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [invoices, invoiceStats, arStats, apStats, revenueTrend, dunningList, upcomingPayments] = await Promise.all([
    InvoiceService.list(organizationId),
    InvoiceService.getStats(organizationId),
    ARService.getStats(organizationId),
    APService.getStats(organizationId),
    InvoiceService.getRevenueTrend(organizationId),
    ARService.getDunningList(organizationId),
    APService.getUpcomingPayments(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Receipt className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Invoicing & AR/AP</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage invoices, accounts receivable, and accounts payable.</p>
      </div>

      <InvoicingDashboard
        organizationId={organizationId}
        initialInvoices={invoices}
        initialInvoiceStats={invoiceStats}
        initialArStats={arStats}
        initialApStats={apStats}
        initialRevenueTrend={revenueTrend}
        initialDunningList={dunningList}
        initialUpcomingPayments={upcomingPayments}
      />
    </div>
  );
}
