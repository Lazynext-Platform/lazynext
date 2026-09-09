import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovRelationsService } from '@/lib/services/gov-relations-service';

/** POST /api/gov-relations/compliance/[id]/approve — approve a compliance record */
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
    const compliance = await GovRelationsService.approveCompliance(id, session.user.id);
    if (!compliance) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ compliance });
  } catch (e) {
    console.error('[gov-relations/compliance/approve] error:', e);
    return NextResponse.json({ error: 'failed_to_approve_compliance' }, { status: 500 });
  }
}
