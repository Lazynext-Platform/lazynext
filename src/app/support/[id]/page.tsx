import type { Metadata } from 'next';
import { Ticket as TicketIcon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Ticket — Lazynext',
  description: 'View and manage a support ticket.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { SupportService } from '@/lib/services/support';
import { Card, Button, EmptyState } from '@/components/ui';
import { TicketDetail } from './TicketDetail';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketPage({ params }: PageProps) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const { id } = await params;
  const ticket = await SupportService.getTicket(id);

  if (!ticket) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="p-8">
          <EmptyState
            icon={TicketIcon}
            title="Ticket not found"
            description="This ticket may have been deleted or you don't have access."
            action={<Button href="/support">Back to Support</Button>}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <TicketDetail ticket={ticket} userId={session.user.id} />
    </div>
  );
}
