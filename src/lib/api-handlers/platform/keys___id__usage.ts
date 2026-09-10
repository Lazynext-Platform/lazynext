import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ApiKeyService } from '@/lib/services/api-key-service';

/** GET /api/platform/keys/[id]/usage — usage stats for an API key */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const sp = req.nextUrl.searchParams;
  const startDate = sp.get('startDate') ? new Date(sp.get('startDate')!) : undefined;
  const endDate = sp.get('endDate') ? new Date(sp.get('endDate')!) : undefined;

  const stats = await ApiKeyService.getUsageStats(id, { startDate, endDate });
  return NextResponse.json({ stats });
}
