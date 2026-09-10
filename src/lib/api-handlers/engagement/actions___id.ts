import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EngagementService } from '@/lib/services/engagement-service';

/** GET /api/engagement/actions/[id] — get a single action */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const action = await EngagementService.getAction(id);
  if (!action) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ action });
}

/** PATCH /api/engagement/actions/[id] — update an action */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const action = await EngagementService.updateAction(id, {
      title: body.title,
      description: body.description,
      owner: body.owner,
      priority: body.priority,
      status: body.status,
      progress: body.progress,
      dueDate: body.dueDate,
      notes: body.notes,
    });
    if (!action) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ action });
  } catch (e) {
    console.error('[engagement/actions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_action' }, { status: 500 });
  }
}
