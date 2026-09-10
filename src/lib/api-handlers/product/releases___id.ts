import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ReleaseService } from '@/lib/services/product-management-service';

/** GET /api/product/releases/[id] — get a single release */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const release = await ReleaseService.get(id);
  if (!release) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ release });
}

/** PATCH /api/product/releases/[id] — update a release */
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
    const release = await ReleaseService.update(id, {
      name: body.name,
      version: body.version,
      description: body.description,
      status: body.status,
      releaseDate: body.releaseDate ? new Date(body.releaseDate) : undefined,
      releaseNotes: body.releaseNotes,
    });
    return NextResponse.json({ release });
  } catch (e) {
    console.error('[product/releases] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_release' }, { status: 500 });
  }
}

/** DELETE /api/product/releases/[id] — delete a release */
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
    await ReleaseService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[product/releases] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_release' }, { status: 500 });
  }
}
