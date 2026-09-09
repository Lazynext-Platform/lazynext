import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmailCampaignService } from '@/lib/services/email-campaign-service';

/** POST /api/email/campaigns/[id]/schedule — schedule a campaign */
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
  const scheduledAt = String(body.scheduledAt || '').trim();
  if (!scheduledAt) {
    return NextResponse.json({ error: 'scheduled_at_required' }, { status: 400 });
  }

  try {
    const campaign = await EmailCampaignService.schedule(id, scheduledAt);
    return NextResponse.json({ campaign });
  } catch (e) {
    console.error('[email/campaigns/[id]/schedule] error:', e);
    return NextResponse.json({ error: 'failed_to_schedule' }, { status: 500 });
  }
}
