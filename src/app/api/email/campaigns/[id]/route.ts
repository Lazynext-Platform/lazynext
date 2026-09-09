import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmailCampaignService } from '@/lib/services/email-campaign-service';

/** GET /api/email/campaigns/[id] — get a single campaign */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const campaign = await EmailCampaignService.get(id);
  if (!campaign) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ campaign });
}

/** PATCH /api/email/campaigns/[id] — update a campaign */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const campaign = await EmailCampaignService.update(id, {
      name: body.name,
      subject: body.subject,
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
    });
    return NextResponse.json({ campaign });
  } catch (e) {
    console.error('[email/campaigns/[id]] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_campaign' }, { status: 500 });
  }
}

/** DELETE /api/email/campaigns/[id] — delete a campaign */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await EmailCampaignService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[email/campaigns/[id]] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_campaign' }, { status: 500 });
  }
}
