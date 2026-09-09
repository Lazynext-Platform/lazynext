import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { WebhookSubscriptionService } from '@/lib/services/webhook-subscription-service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const subscription = await WebhookSubscriptionService.get(id);
  if (!subscription) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ subscription });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const updated = await WebhookSubscriptionService.update(id, {
      name: body.name,
      url: body.url,
      events: body.events,
      status: body.status,
    });
    return NextResponse.json({ subscription: updated });
  } catch (e) {
    console.error('[platform/webhooks] update error:', e);
    return NextResponse.json({ error: 'failed_to_update' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  await WebhookSubscriptionService.delete(id);
  return NextResponse.json({ ok: true });
}
