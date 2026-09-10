import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SubscriberService } from '@/lib/services/subscriber-service';

/** GET /api/email/lists/[id]/stats — get list stats */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const stats = await SubscriberService.getListStats(id);
  return NextResponse.json({ stats });
}
