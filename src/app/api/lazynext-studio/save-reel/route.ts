import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  isManagedMediaUrl,
  MediaStorageNotConfiguredError,
  putMedia,
} from '@/lib/media-storage';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

// Save final video to history: final video blob → R2, metadata → D1 Creation. Requires login (not logged in won't save history, final video still viewable/downloadable locally).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      const reelUrl = isManagedMediaUrl(body.url) ? String(body.url) : '';
      if (!reelUrl) return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
      const title = String(body.title || 'Untitled').slice(0, 500);
      const type = String(body.type || 'lazynext-studio');
      const thumbnail = String(body.thumbnail || '') || null;
      const creationId = String(body.creationId || '');
      const shots = Array.isArray(body.shots)
        ? body.shots.filter(
            (value: unknown): value is string => typeof value === 'string',
          )
        : [];
      const outputs = [reelUrl, ...shots];

      if (creationId) {
        const upd = await prisma.creation.updateMany({
          where: { id: creationId, userId: session.user.id },
          data: { status: 'completed', prompt: title, inputImage: thumbnail, outputs },
        });
        if (upd.count === 1) return NextResponse.json({ id: creationId, url: reelUrl });
      }
      const creation = await prisma.creation.create({
        data: {
          userId: session.user.id,
          templateId: type,
          model: type === 'drama-studio' ? 'drama' : 'marketing',
          prompt: title,
          inputImage: thumbnail,
          status: 'completed',
          outputs,
        },
      });
      return NextResponse.json({ id: creation.id, url: reelUrl });
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) return NextResponse.json({ error: 'no_file' }, { status: 400 });
    const buf = await file.arrayBuffer();

    const key = `reel-${crypto.randomUUID()}.mp4`;
    const reelUrl = await putMedia(key, buf, 'video/mp4');

    const title = String(form.get('title') || 'Untitled').slice(0, 500);
    const type = String(form.get('type') || 'lazynext-studio');
    const thumbnail = String(form.get('thumbnail') || '') || null;
    const creationId = String(form.get('creationId') || '');
    let shots: string[] = [];
    try { shots = JSON.parse(String(form.get('shots') || '[]')); } catch { /* ignore */ }
    const outputs = [reelUrl, ...shots.filter((s) => typeof s === 'string')];

    // With creationId → update the placeholder record created at generation start (processing → completed); otherwise create new (backward compatible).
    if (creationId) {
      const upd = await prisma.creation.updateMany({
        where: { id: creationId, userId: session.user.id },
        data: { status: 'completed', prompt: title, inputImage: thumbnail, outputs },
      });
      if (upd.count === 1) return NextResponse.json({ id: creationId, url: reelUrl });
    }
    const creation = await prisma.creation.create({
      data: {
        userId: session.user.id,
        templateId: type,
        model: type === 'drama-studio' ? 'drama' : 'marketing',
        prompt: title,
        inputImage: thumbnail,
        status: 'completed',
        outputs,
      },
    });
    return NextResponse.json({ id: creation.id, url: reelUrl });
  } catch (e) {
    if (e instanceof MediaStorageNotConfiguredError) {
      return NextResponse.json(
        { error: 'no_media_storage' },
        { status: 500 },
      );
    }
    console.error('[lazynext-studio/save-reel] error:', String(e));
    return NextResponse.json({ error: 'save_failed' }, { status: 502 });
  }
}
