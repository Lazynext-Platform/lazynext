import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** POST /api/regulatory/changes/[id]/implement — implement a change */
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
  const implementationPlan = String(body.implementationPlan || '').trim();
  if (!implementationPlan) {
    return NextResponse.json({ error: 'implementationPlan_required' }, { status: 400 });
  }

  try {
    const change = await RegulatoryService.implementChange(id, implementationPlan, session.user.id);
    if (!change) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ change });
  } catch (e) {
    console.error('[regulatory/changes] implement error:', e);
    return NextResponse.json({ error: 'failed_to_implement_change' }, { status: 500 });
  }
}
