import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GrantService } from '@/lib/services/grant-service';

/** POST /api/grants/disbursements/[id]/approve — approve a disbursement */
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
    const disbursement = await GrantService.approveDisbursement(id, session.user.id);
    if (!disbursement) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ disbursement });
  } catch (e) {
    console.error('[grants/disbursements/approve] error:', e);
    return NextResponse.json({ error: 'failed_to_approve_disbursement' }, { status: 500 });
  }
}
