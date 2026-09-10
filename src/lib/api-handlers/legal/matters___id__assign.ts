import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LegalMatterService } from '@/lib/services/legal-matter-service';

/** POST /api/legal/matters/[id]/assign — assign matter */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const assignedTo = String(body.assignedTo || '').trim();
  if (!assignedTo) {
    return NextResponse.json({ error: 'assignedTo_required' }, { status: 400 });
  }

  try {
    const matter = await LegalMatterService.assign(id, assignedTo);
    if (!matter) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ matter });
  } catch (e) {
    console.error('[legal/matters] assign error:', e);
    return NextResponse.json({ error: 'failed_to_assign' }, { status: 500 });
  }
}
