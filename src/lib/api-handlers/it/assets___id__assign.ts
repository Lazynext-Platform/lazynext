import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ITAssetService } from '@/lib/services/it-asset-service';

/** POST /api/it/assets/[id]/assign — assign an IT asset */
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
  const assignedToId = String(body.assignedToId || '').trim();
  if (!assignedToId) {
    return NextResponse.json({ error: 'assignedToId_required' }, { status: 400 });
  }

  try {
    const asset = await ITAssetService.assign(id, assignedToId, body.assignedToType || 'employee');
    return NextResponse.json({ asset });
  } catch (e) {
    console.error('[it/assets/assign] error:', e);
    return NextResponse.json({ error: 'failed_to_assign_asset' }, { status: 500 });
  }
}
