import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WebhookSubscriptionService } from '@/lib/services/webhook-subscription-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  try {
    const result = await WebhookSubscriptionService.pause(id);
    return NextResponse.json({ subscription: result });
  } catch (e) {
    console.error('[platform/webhooks] pause error:', e);
    return NextResponse.json({ error: 'pause_failed' }, { status: 500 });
  }
}
