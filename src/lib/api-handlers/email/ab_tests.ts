import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmailABTestService } from '@/lib/services/email-ab-test-service';

/** GET /api/email/ab-tests — list A/B tests for the workspace */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ tests: [] });
  }

  const stats = await EmailABTestService.getStats(workspaces[0].id);
  return NextResponse.json({ stats });
}

/** POST /api/email/ab-tests — create a new A/B test */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const campaignId = String(body.campaignId || '').trim();
  if (!name || !campaignId) {
    return NextResponse.json({ error: 'name_and_campaign_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const test = await EmailABTestService.create({
      workspaceId: ws.id,
      organizationId: ws.organizationId,
      createdBy: session.user.id,
      data: {
        name,
        campaignId,
        variants: body.variants || [],
        metric: body.metric || 'open_rate',
        status: body.status,
      },
    });
    return NextResponse.json({ test }, { status: 201 });
  } catch (e) {
    console.error('[email/ab-tests] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_test' }, { status: 500 });
  }
}
