import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ApiKeyService } from '@/lib/services/api-key-service';

/** GET /api/platform/keys/[id] — get a single API key */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const key = await ApiKeyService.get(id);
  if (!key) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ key });
}

/** PATCH /api/platform/keys/[id] — update an API key */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const key = await ApiKeyService.update(id, {
      name: body.name,
      description: body.description,
      scopes: Array.isArray(body.scopes) ? body.scopes : undefined,
      rateLimitPerMin: body.rateLimitPerMin,
      rateLimitPerDay: body.rateLimitPerDay,
    });
    return NextResponse.json({ key });
  } catch (e) {
    console.error('[platform/keys] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_key' }, { status: 500 });
  }
}

/** DELETE /api/platform/keys/[id] — delete an API key */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await ApiKeyService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[platform/keys] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_key' }, { status: 500 });
  }
}
