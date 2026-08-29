import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { putMedia } from '@/lib/media-storage';

export const maxDuration = 60;

// Upload an asset image (product reference / avatar portrait / brand logo) to
// media storage (R2 in production, local filesystem in dev).
// Requires login (prevents anonymous abuse of upload quota), no charge.
// Accepts a data:image/* URL up to 8 MB.
async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const dataUrl = typeof body.dataUrl === 'string' ? body.dataUrl : '';
  if (!dataUrl.startsWith('data:image/')) return NextResponse.json({ error: 'invalid_image' }, { status: 400 });
  if (dataUrl.length > 8_000_000) return NextResponse.json({ error: 'image_too_large' }, { status: 400 });

  try {
    const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
    if (!match) throw new Error('invalid_data_url');
    const contentType = match[1];
    const buffer = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0)).buffer as ArrayBuffer;
    const ext = contentType.split('/')[1] === 'jpeg' ? 'jpg' : (contentType.split('/')[1] || 'png');
    const key = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const url = await putMedia(key, buffer, contentType);
    return NextResponse.json({ url });
  } catch (e) {
    console.error('[assets/upload] error:', String(e));
    return NextResponse.json({ error: 'upload_failed' }, { status: 502 });
  }
}

export { POST };
