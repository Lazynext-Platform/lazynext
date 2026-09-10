import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RecruitmentService } from '@/lib/services/recruitment-service';

/** POST /api/recruitment/offers/[id]/send — send an offer */
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
    const offer = await RecruitmentService.sendOffer(id);
    return NextResponse.json({ offer });
  } catch (e) {
    console.error('[recruitment/offers/send] error:', e);
    return NextResponse.json({ error: 'failed_to_send_offer' }, { status: 500 });
  }
}
