import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { deliverableMediaUrl, sameOriginMediaPath } from '@/lib/public-media-url';

export const maxDuration = 30;

// Save viral replica final video to history. Edit/dubbing/lip-sync intermediate tasks are each persisted but hidden from the history panel.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const outputUrl = deliverableMediaUrl(body.outputUrl, req);
  if (!outputUrl) return NextResponse.json({ error: 'invalid_output_url' }, { status: 400 });

  const thumbnail = sameOriginMediaPath(body.thumbnail, req) || null;
  const title = (typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'Reference to Ad').slice(0, 500);

  const creationId = typeof body.creationId === 'string' ? body.creationId : '';
  if (creationId) {
    const upd = await prisma.creation.updateMany({
      where: { id: creationId, userId: session.user.id },
      data: { status: 'completed', prompt: title, inputImage: thumbnail, outputs: [outputUrl] },
    });
    if (upd.count === 1) return NextResponse.json({ id: creationId, url: outputUrl });
  }

  const creation = await prisma.creation.create({
    data: {
      userId: session.user.id,
      templateId: 'ad-reference',
      model: 'ad-reference',
      prompt: title,
      inputImage: thumbnail,
      status: 'completed',
      outputs: [outputUrl],
    },
  });

  return NextResponse.json({ id: creation.id, url: outputUrl });
}
