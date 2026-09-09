import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { StrategyService } from '@/lib/services/strategy-service';

/** GET /api/strategy/okrs/[id]/progress — get OKR progress */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const progress = await StrategyService.getOkRProgress(id);
  return NextResponse.json({ progress });
}
