import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FranchiseService } from '@/lib/services/franchise-service';

/** POST /api/franchise/compliance/[id]/resolve — resolve a compliance issue */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const resolution = String(body.resolution || '').trim();
  if (!resolution) {
    return NextResponse.json({ error: 'resolution_required' }, { status: 400 });
  }

  try {
    const compliance = await FranchiseService.resolveCompliance(id, resolution, session.user.id);
    if (!compliance) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ compliance });
  } catch (e) {
    console.error('[franchise/compliance/resolve] error:', e);
    return NextResponse.json({ error: 'failed_to_resolve_compliance' }, { status: 500 });
  }
}
