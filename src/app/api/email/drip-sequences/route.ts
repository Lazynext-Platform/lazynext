import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DripSequenceService } from '@/lib/services/drip-sequence-service';

/** GET /api/email/drip-sequences — list drip sequences */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ sequences: [] });
  }

  const sequences = await DripSequenceService.list(workspaces[0].id);
  return NextResponse.json({ sequences });
}

/** POST /api/email/drip-sequences — create a new drip sequence */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const sequence = await DripSequenceService.create({
      workspaceId: ws.id,
      organizationId: ws.organizationId,
      createdBy: session.user.id,
      data: {
        name,
        description: body.description,
        steps: body.steps || [],
        status: body.status,
        listId: body.listId,
        trigger: body.trigger,
      },
    });
    return NextResponse.json({ sequence }, { status: 201 });
  } catch (e) {
    console.error('[email/drip-sequences] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_sequence' }, { status: 500 });
  }
}
