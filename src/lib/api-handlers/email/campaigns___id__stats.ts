import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmailCampaignService } from '@/lib/services/email-campaign-service';

/** GET /api/email/campaigns/[id]/stats — get campaign stats and tracking */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const [stats, tracking, byDate] = await Promise.all([
    EmailCampaignService.getStats(id),
    EmailCampaignService.getTracking(id),
    EmailCampaignService.getStatsByDate(id),
  ]);
  return NextResponse.json({ stats, tracking, byDate });
}
