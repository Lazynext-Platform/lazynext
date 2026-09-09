import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ITAssetService } from '@/lib/services/it-asset-service';

/** POST /api/it/assets/[id]/unassign — unassign an IT asset */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const asset = await ITAssetService.unassign(id);
    return NextResponse.json({ asset });
  } catch (e) {
    console.error('[it/assets/unassign] error:', e);
    return NextResponse.json({ error: 'failed_to_unassign_asset' }, { status: 500 });
  }
}
