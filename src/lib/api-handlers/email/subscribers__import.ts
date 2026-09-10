import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SubscriberService } from '@/lib/services/subscriber-service';

/** POST /api/email/subscribers/import — bulk import subscribers */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const subscribers = Array.isArray(body.subscribers) ? body.subscribers : [];
  if (subscribers.length === 0) {
    return NextResponse.json({ error: 'subscribers_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const result = await SubscriberService.importSubscribers({
      workspaceId: ws.id,
      organizationId: ws.organizationId,
      createdBy: session.user.id,
      subscribers,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error('[email/subscribers/import] error:', e);
    return NextResponse.json({ error: 'failed_to_import' }, { status: 500 });
  }
}
