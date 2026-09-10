import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { StakeholderService } from '@/lib/services/stakeholder-service';

/** GET /api/stakeholders/engagements — list engagements */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ engagements: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { stakeholderId?: string; type?: string; status?: string } = {};
  const stakeholderId = url.searchParams.get('stakeholderId');
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  if (stakeholderId) opts.stakeholderId = stakeholderId;
  if (type) opts.type = type;
  if (status) opts.status = status;

  const engagements = await StakeholderService.listEngagements(organizationId, opts as never);
  return NextResponse.json({ engagements });
}

/** POST /api/stakeholders/engagements — create an engagement */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const stakeholderId = String(body.stakeholderId || '').trim();
  const type = String(body.type || '').trim();
  const date = String(body.date || '').trim();
  const topic = String(body.topic || '').trim();
  if (!stakeholderId || !type || !date || !topic) {
    return NextResponse.json({ error: 'stakeholderId_type_date_topic_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const engagement = await StakeholderService.createEngagement(
      ws.organizationId, ws.id,
      {
        stakeholderId, type: type as never, date, topic,
        outcome: body.outcome, actionItems: body.actionItems,
        nextSteps: body.nextSteps, attendees: body.attendees, status: body.status,
      },
      session.user.id,
    );
    return NextResponse.json({ engagement }, { status: 201 });
  } catch (e) {
    console.error('[stakeholders/engagements] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_engagement' }, { status: 500 });
  }
}
