import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RiskService } from '@/lib/services/risk-service';

/** POST /api/risks/[id]/owner — assign risk owner */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const owner = String(body.owner || '').trim();
  if (!owner) {
    return NextResponse.json({ error: 'owner_required' }, { status: 400 });
  }

  try {
    const risk = await RiskService.assignOwner(id, owner);
    if (!risk) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ risk });
  } catch (e) {
    console.error('[risks] owner error:', e);
    return NextResponse.json({ error: 'failed_to_assign_owner' }, { status: 500 });
  }
}
