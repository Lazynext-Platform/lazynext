import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ReleaseService } from '@/lib/services/product-management-service';

/** POST /api/product/releases/[id]/changelog — generate changelog for a release */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const release = await ReleaseService.generateChangelog(id);
    return NextResponse.json({ release });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_generate_changelog';
    if (msg === 'release_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error('[product/releases/changelog] error:', e);
    return NextResponse.json({ error: 'failed_to_generate_changelog' }, { status: 500 });
  }
}
