import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmailCampaignService } from '@/lib/services/email-campaign-service';

/** POST /api/email/campaigns/[id]/duplicate — duplicate a campaign */
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
    const campaign = await EmailCampaignService.duplicate(id, session.user.id);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (e) {
    console.error('[email/campaigns/[id]/duplicate] error:', e);
    return NextResponse.json({ error: 'failed_to_duplicate' }, { status: 500 });
  }
}
