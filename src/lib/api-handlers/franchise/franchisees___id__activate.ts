import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FranchiseService } from '@/lib/services/franchise-service';

/** POST /api/franchise/franchisees/[id]/activate — activate a franchisee */
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
    const franchisee = await FranchiseService.activateFranchisee(id, session.user.id);
    if (!franchisee) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ franchisee });
  } catch (e) {
    console.error('[franchise/franchisees/activate] error:', e);
    return NextResponse.json({ error: 'failed_to_activate_franchisee' }, { status: 500 });
  }
}
