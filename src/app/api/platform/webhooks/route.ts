import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { WebhookSubscriptionService } from '@/lib/services/webhook-subscription-service';

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ subscriptions: [] });
  const organizationId = workspaces[0].organizationId;
  const subscriptions = await WebhookSubscriptionService.list(organizationId);
  return NextResponse.json({ subscriptions });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const url = String(body.url || '').trim();
  if (!name || !url) return NextResponse.json({ error: 'name_and_url_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const organizationId = workspaces[0].organizationId;
  try {
    const { subscription, secret } = await WebhookSubscriptionService.create(organizationId, {
      name,
      url,
      events: Array.isArray(body.events) ? body.events : ['*'],
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ subscription, secret }, { status: 201 });
  } catch (e) {
    console.error('[platform/webhooks] create error:', e);
    return NextResponse.json({ error: 'failed_to_create' }, { status: 500 });
  }
}
