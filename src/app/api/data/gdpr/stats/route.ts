import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GdprService } from '@/lib/services/gdpr-service';

/** GET /api/data/gdpr/stats — GDPR aggregate stats */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const stats = await GdprService.getStats();
  return NextResponse.json(stats);
}
