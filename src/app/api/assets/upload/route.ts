import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { uploadMedia } from '@/lib/atlas';

export const maxDuration = 60;

// Upload an asset image (product reference / avatar portrait / brand logo) to
// Atlas to get a persistent URL. Requires login (prevents anonymous abuse of
// upload quota), no charge. Accepts a data:image/* URL up to 8 MB.
async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const dataUrl = typeof body.dataUrl === 'string' ? body.dataUrl : '';
  if (!dataUrl.startsWith('data:image/')) return NextResponse.json({ error: 'invalid_image' }, { status: 400 });
  if (dataUrl.length > 8_000_000) return NextResponse.json({ error: 'image_too_large' }, { status: 400 });

  try {
    const url = await uploadMedia(dataUrl, 'asset');
    if (!/^https?:\/\//.test(url)) throw new Error('upload returned no url');
    return NextResponse.json({ url });
  } catch (e) {
    console.error('[assets/upload] atlas error:', String(e));
    return NextResponse.json({ error: 'upload_failed', detail: String(e) }, { status: 502 });
  }
}

export const POST = withAtlas(__byokPOST);
