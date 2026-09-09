import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DripSequenceService } from '@/lib/services/drip-sequence-service';

/** POST /api/email/drip-sequences/process — process pending drip steps */
export async function POST(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await DripSequenceService.processPendingSteps();
    return NextResponse.json(result);
  } catch (e) {
    console.error('[email/drip-sequences/process] error:', e);
    return NextResponse.json({ error: 'failed_to_process' }, { status: 500 });
  }
}
