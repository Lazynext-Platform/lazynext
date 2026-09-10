import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { WebhookDispatcher } from '@/lib/automation/webhook-dispatcher';

/**
 * GET /api/webhooks/stats/[id] — webhook delivery stats.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    // Verify ownership.
    const ownership = await prisma.webhookEndpoint.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!ownership) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const stats = await WebhookDispatcher.getWebhookStats(id);
    if (!stats) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ stats });
  } catch (e) {
    console.error('[webhooks/stats] error:', e);
    return NextResponse.json({ error: 'failed_to_get_webhook_stats' }, { status: 500 });
  }
}
