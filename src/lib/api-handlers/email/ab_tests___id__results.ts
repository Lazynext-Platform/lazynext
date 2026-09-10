import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmailABTestService } from '@/lib/services/email-ab-test-service';

/** GET /api/email/ab-tests/[id]/results — get A/B test results */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const results = await EmailABTestService.getResults(id);
  return NextResponse.json({ results });
}
