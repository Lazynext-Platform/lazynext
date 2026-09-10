import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CommunicationsService } from '@/lib/services/communications-service';

/** GET /api/communications/press-releases/[id] — get a single press release */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const pressRelease = await CommunicationsService.getPressRelease(id);
  if (!pressRelease) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ pressRelease });
}

/** PATCH /api/communications/press-releases/[id] — update a press release */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const pressRelease = await CommunicationsService.updatePressRelease(id, {
      title: body.title, content: body.content, summary: body.summary, status: body.status,
      publishDate: body.publishDate, embargoDate: body.embargoDate, author: body.author,
      distributionList: body.distributionList, tags: body.tags, mediaAssets: body.mediaAssets,
    });
    if (!pressRelease) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ pressRelease });
  } catch (e) {
    console.error('[communications/press-releases] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_press_release' }, { status: 500 });
  }
}

/** DELETE /api/communications/press-releases/[id] — delete a press release */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const ok = await CommunicationsService.deletePressRelease(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[communications/press-releases] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_press_release' }, { status: 500 });
  }
}
