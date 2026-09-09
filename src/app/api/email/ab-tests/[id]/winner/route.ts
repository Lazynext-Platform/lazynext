import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmailABTestService } from '@/lib/services/email-ab-test-service';

/** POST /api/email/ab-tests/[id]/winner — declare a winner for an A/B test */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const variantId = String(body.variantId || '').trim();
  if (!variantId) {
    return NextResponse.json({ error: 'variant_id_required' }, { status: 400 });
  }

  try {
    const test = await EmailABTestService.declareWinner(id, variantId);
    return NextResponse.json({ test });
  } catch (e) {
    console.error('[email/ab-tests/[id]/winner] error:', e);
    return NextResponse.json({ error: 'failed_to_declare_winner' }, { status: 500 });
  }
}
