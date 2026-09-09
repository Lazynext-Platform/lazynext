import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmailCampaignService } from '@/lib/services/email-campaign-service';

/** POST /api/email/campaigns/[id]/send — send a campaign to subscribers */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const subscriberIds: string[] = Array.isArray(body.subscriberIds) ? body.subscriberIds : [];

  if (subscriberIds.length === 0) {
    return NextResponse.json({ error: 'subscribers_required' }, { status: 400 });
  }

  try {
    const result = await EmailCampaignService.send(id, subscriberIds, session.user.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[email/campaigns/[id]/send] error:', e);
    return NextResponse.json({ error: 'failed_to_send' }, { status: 500 });
  }
}
