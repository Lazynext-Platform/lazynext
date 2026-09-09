import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmailABTestService } from '@/lib/services/email-ab-test-service';

/** GET /api/email/ab-tests/[id] — get a single A/B test */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const test = await EmailABTestService.get(id);
  if (!test) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ test });
}

/** DELETE /api/email/ab-tests/[id] — delete an A/B test */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await EmailABTestService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[email/ab-tests/[id]] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_test' }, { status: 500 });
  }
}
