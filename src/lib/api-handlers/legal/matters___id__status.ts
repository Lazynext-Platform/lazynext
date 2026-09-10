import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LegalMatterService } from '@/lib/services/legal-matter-service';

/** POST /api/legal/matters/[id]/status — change matter status */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  if (!body.status) {
    return NextResponse.json({ error: 'status_required' }, { status: 400 });
  }

  try {
    const matter = await LegalMatterService.changeStatus(id, body.status);
    if (!matter) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ matter });
  } catch (e) {
    console.error('[legal/matters] status error:', e);
    return NextResponse.json({ error: 'failed_to_change_status' }, { status: 500 });
  }
}
