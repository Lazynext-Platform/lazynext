import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AssetLifecycleService } from '@/lib/services/asset-lifecycle-service';

/** POST /api/asset-lifecycle/maintenance/[id]/complete — mark maintenance completed */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const maintenance = await AssetLifecycleService.completeMaintenance(
      id,
      String(body.performedBy || session.user.id),
      Number(body.cost ?? 0),
      String(body.notes || ''),
    );
    return NextResponse.json({ maintenance });
  } catch (e) {
    console.error('[asset-lifecycle/maintenance/complete] error:', e);
    return NextResponse.json({ error: 'failed_to_complete_maintenance' }, { status: 500 });
  }
}
