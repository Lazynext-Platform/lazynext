import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InvestorRelationsService } from '@/lib/services/investor-relations-service';

/** POST /api/investor-relations/updates/[id]/publish — publish an update */
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
    const update = await InvestorRelationsService.publishUpdate(id, session.user.id);
    if (!update) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ update });
  } catch (e) {
    console.error('[investor-relations/updates] publish error:', e);
    return NextResponse.json({ error: 'failed_to_publish_update' }, { status: 500 });
  }
}
