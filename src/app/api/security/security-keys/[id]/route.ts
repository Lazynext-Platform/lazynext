import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SecurityKeyService } from '@/lib/services/security-key-service';

/** DELETE /api/security/security-keys/[id] — remove a security key */
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
    const result = await SecurityKeyService.removeKey(session.user.id, id);
    if (!result.removed) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error('[security/security-keys/delete] error:', e);
    return NextResponse.json({ error: 'failed_to_remove_key' }, { status: 500 });
  }
}

/** PATCH /api/security/security-keys/[id] — rename a security key */
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
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  try {
    const result = await SecurityKeyService.renameKey(session.user.id, id, name);
    if (!result.renamed) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error('[security/security-keys/patch] error:', e);
    return NextResponse.json({ error: 'failed_to_rename_key' }, { status: 500 });
  }
}
