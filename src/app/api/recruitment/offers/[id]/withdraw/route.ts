import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RecruitmentService } from '@/lib/services/recruitment-service';

/** POST /api/recruitment/offers/[id]/withdraw — withdraw an offer */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const offer = await RecruitmentService.withdrawOffer(id);
    return NextResponse.json({ offer });
  } catch (e) {
    console.error('[recruitment/offers/withdraw] error:', e);
    return NextResponse.json({ error: 'failed_to_withdraw_offer' }, { status: 500 });
  }
}
