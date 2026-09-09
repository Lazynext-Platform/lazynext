import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FranchiseService } from '@/lib/services/franchise-service';

/** POST /api/franchise/territories/[id]/assign — assign a territory to a franchisee */
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
  const franchiseeId = String(body.franchiseeId || '').trim();
  if (!franchiseeId) {
    return NextResponse.json({ error: 'franchiseeId_required' }, { status: 400 });
  }

  try {
    const territory = await FranchiseService.assignTerritory(id, franchiseeId, session.user.id);
    if (!territory) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ territory });
  } catch (e) {
    console.error('[franchise/territories/assign] error:', e);
    return NextResponse.json({ error: 'failed_to_assign_territory' }, { status: 500 });
  }
}
