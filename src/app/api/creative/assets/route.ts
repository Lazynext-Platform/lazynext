import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { listAssets, type AssetType } from '@/lib/creative/asset-persist';

export const maxDuration = 30;

async function __byokGET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get('type') as AssetType | null;

  const assets = await listAssets(session.user.id, type || undefined);

  return NextResponse.json({ assets });
}

export const GET = withAtlas(__byokGET);
