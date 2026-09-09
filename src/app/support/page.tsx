import type { Metadata } from 'next';
import { Ticket as TicketIcon, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Support — Lazynext',
  description: 'Manage support tickets — track issues, SLAs, and customer requests.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SupportService } from '@/lib/services/support';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { TicketDashboard } from './TicketDashboard';

export const dynamic = 'force-dynamic';

export default async function SupportPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Support</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage support tickets — track issues, SLAs, and customer requests.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={TicketIcon}
            title="No workspace yet"
            description="Create a company first to start managing support tickets."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const defaultWorkspace = workspaces[0];
  const [tickets, stats, slaTickets] = await Promise.all([
    SupportService.listTickets(defaultWorkspace.id),
    SupportService.getStats(defaultWorkspace.id),
    SupportService.getSlaStatus(defaultWorkspace.id),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl">Support</h1>
        <p className="text-sm text-fg-secondary mt-1">Manage support tickets — track issues, SLAs, and customer requests.</p>
      </div>

      <TicketDashboard
        workspaceId={defaultWorkspace.id}
        organizationId={defaultWorkspace.organizationId}
        workspaces={workspaces.map((w) => ({ id: w.id, organizationId: w.organizationId, name: w.name }))}
        initialTickets={tickets}
        initialStats={stats}
        initialSlaTickets={slaTickets}
      />
    </div>
  );
}
