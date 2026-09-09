import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ITProcurementService } from '@/lib/services/it-procurement-service';

/** POST /api/it/procurement/[id]/ordered — mark a procurement request as ordered */
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
    const request = await ITProcurementService.markOrdered(id);
    return NextResponse.json({ request });
  } catch (e) {
    console.error('[it/procurement/ordered] error:', e);
    return NextResponse.json({ error: 'failed_to_mark_ordered' }, { status: 500 });
  }
}
