import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmailCampaignService } from '@/lib/services/email-campaign-service';

/** GET /api/email/campaigns — list email campaigns */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ campaigns: [] });
  }

  const workspaceId = workspaces[0].id;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('search') || undefined;

  const campaigns = await EmailCampaignService.list(workspaceId, { status, search });
  return NextResponse.json({ campaigns });
}

/** POST /api/email/campaigns — create a new email campaign */
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
    const campaign = await EmailCampaignService.create({
      workspaceId: ws.id,
      organizationId: ws.organizationId,
      createdBy: session.user.id,
      data: {
        name,
        subject: String(body.subject || ''),
        preheader: body.preheader,
        fromName: body.fromName,
        fromEmail: body.fromEmail,
        replyTo: body.replyTo,
        templateId: body.templateId,
        listId: body.listId,
        segmentId: body.segmentId,
        bodyHtml: body.bodyHtml,
        bodyText: body.bodyText,
        status: body.status,
        scheduledAt: body.scheduledAt,
        tags: body.tags,
      },
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (e) {
    console.error('[email/campaigns] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_campaign' }, { status: 500 });
  }
}
