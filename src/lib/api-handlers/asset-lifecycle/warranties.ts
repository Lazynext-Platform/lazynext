import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AssetWarrantyService } from '@/lib/services/asset-warranty-service';

/** GET /api/asset-lifecycle/warranties — list warranties */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ warranties: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { itAssetId?: string; status?: string; provider?: string } = {};
  const itAssetId = url.searchParams.get('itAssetId');
  const status = url.searchParams.get('status');
  const provider = url.searchParams.get('provider');
  if (itAssetId) opts.itAssetId = itAssetId;
  if (status) opts.status = status;
  if (provider) opts.provider = provider;

  const warranties = await AssetWarrantyService.list(organizationId, opts);
  return NextResponse.json({ warranties });
}

/** POST /api/asset-lifecycle/warranties — create a warranty */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const itAssetId = String(body.itAssetId || '').trim();
  const provider = String(body.provider || '').trim();
  if (!itAssetId || !provider) {
    return NextResponse.json({ error: 'itAssetId_and_provider_required' }, { status: 400 });
  }
  if (!body.startDate || !body.endDate) {
    return NextResponse.json({ error: 'start_and_end_dates_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const warranty = await AssetWarrantyService.create(organizationId, {
      itAssetId,
      provider,
      type: body.type,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      coverage: body.coverage,
      terms: body.terms,
      status: body.status,
    });
    return NextResponse.json({ warranty }, { status: 201 });
  } catch (e) {
    console.error('[asset-lifecycle/warranties] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_warranty' }, { status: 500 });
  }
}
