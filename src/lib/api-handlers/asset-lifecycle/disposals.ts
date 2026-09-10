import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AssetDepreciationService } from '@/lib/services/asset-depreciation-service';

/** GET /api/asset-lifecycle/disposals — list asset disposal records */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ disposals: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const disposals = await AssetDepreciationService.getAssetDisposals(organizationId);
  return NextResponse.json({ disposals });
}

/** POST /api/asset-lifecycle/disposals — record an asset disposal */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const itAssetId = String(body.itAssetId || '').trim();
  const disposalMethod = String(body.disposalMethod || '').trim();
  if (!itAssetId || !disposalMethod) {
    return NextResponse.json({ error: 'itAssetId_and_disposalMethod_required' }, { status: 400 });
  }
  if (!body.disposalDate) {
    return NextResponse.json({ error: 'disposalDate_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const disposal = await AssetDepreciationService.recordDisposal(
      ws.organizationId,
      ws.id,
      {
        itAssetId,
        disposalDate: new Date(body.disposalDate),
        disposalMethod: disposalMethod as 'sold' | 'donated' | 'recycled' | 'scrapped',
        disposalValue: Number(body.disposalValue ?? 0),
        reason: String(body.reason || ''),
      },
      session.user.id,
    );
    return NextResponse.json({ disposal }, { status: 201 });
  } catch (e) {
    console.error('[asset-lifecycle/disposals] create error:', e);
    return NextResponse.json({ error: 'failed_to_record_disposal' }, { status: 500 });
  }
}
