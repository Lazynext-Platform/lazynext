import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { listAssets, deleteAsset, type AssetType } from '@/lib/creative/asset-persist';

export const maxDuration = 30;

async function __byokGET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get('type') as AssetType | null;

  const assets = await listAssets(session.user.id, type || undefined);

  return NextResponse.json({ assets });
}

async function __byokDELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  const deleted = await deleteAsset(session.user.id, id);
  if (deleted === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({ ok: true, deleted });
}

export const GET = withAtlas(__byokGET);
export const DELETE = withAtlas(__byokDELETE);
