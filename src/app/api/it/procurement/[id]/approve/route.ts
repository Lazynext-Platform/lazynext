import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ITProcurementService } from '@/lib/services/it-procurement-service';

/** POST /api/it/procurement/[id]/approve — approve a procurement request */
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
    const request = await ITProcurementService.approve(id, session.user.id);
    return NextResponse.json({ request });
  } catch (e) {
    console.error('[it/procurement/approve] error:', e);
    return NextResponse.json({ error: 'failed_to_approve' }, { status: 500 });
  }
}
