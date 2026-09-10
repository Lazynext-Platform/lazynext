import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmailCampaignService } from '@/lib/services/email-campaign-service';

/** POST /api/email/campaigns/[id]/cancel-schedule — cancel a scheduled campaign */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const campaign = await EmailCampaignService.cancelSchedule(id);
    return NextResponse.json({ campaign });
  } catch (e) {
    console.error('[email/campaigns/[id]/cancel-schedule] error:', e);
    return NextResponse.json({ error: 'failed_to_cancel' }, { status: 500 });
  }
}
