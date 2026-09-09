import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { StakeholderService } from '@/lib/services/stakeholder-service';

/** GET /api/stakeholders/communications — list communications */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ communications: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { stakeholderId?: string; channel?: string; status?: string } = {};
  const stakeholderId = url.searchParams.get('stakeholderId');
  const channel = url.searchParams.get('channel');
  const status = url.searchParams.get('status');
  if (stakeholderId) opts.stakeholderId = stakeholderId;
  if (channel) opts.channel = channel;
  if (status) opts.status = status;

  const communications = await StakeholderService.listCommunications(organizationId, opts as never);
  return NextResponse.json({ communications });
}

/** POST /api/stakeholders/communications — create a communication */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const stakeholderId = String(body.stakeholderId || '').trim();
  const channel = String(body.channel || '').trim();
  const subject = String(body.subject || '').trim();
  const content = String(body.content || '').trim();
  const date = String(body.date || '').trim();
  if (!stakeholderId || !channel || !subject || !content || !date) {
    return NextResponse.json({ error: 'stakeholderId_channel_subject_content_date_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const communication = await StakeholderService.createCommunication(
      ws.organizationId, ws.id,
      {
        stakeholderId, channel: channel as never, subject, content, date,
        sentBy: body.sentBy, status: body.status, response: body.response, responseDate: body.responseDate,
      },
      session.user.id,
    );
    return NextResponse.json({ communication }, { status: 201 });
  } catch (e) {
    console.error('[stakeholders/communications] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_communication' }, { status: 500 });
  }
}
