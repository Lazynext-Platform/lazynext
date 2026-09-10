import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RetentionService } from '@/lib/services/retention-service';

/**
 * GET /api/retention/[id] — get a single retention policy.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const policy = await RetentionService.getPolicy(id);
    if (!policy) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ policy });
  } catch (e) {
    console.error('[retention] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_policy' }, { status: 500 });
  }
}

/**
 * PATCH /api/retention/[id] — update a retention policy.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  let body: {
    name?: string;
    dataType?: string;
    retentionDays?: number;
    action?: string;
    enabled?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const updated = await RetentionService.updatePolicy(id, {
      name: body.name?.trim(),
      dataType: body.dataType,
      retentionDays: body.retentionDays,
      action: body.action,
      enabled: body.enabled,
    });
    return NextResponse.json({ policy: updated });
  } catch (e) {
    console.error('[retention] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_policy' }, { status: 500 });
  }
}

/**
 * DELETE /api/retention/[id] — delete a retention policy.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    await RetentionService.deletePolicy(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[retention] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_policy' }, { status: 500 });
  }
}
