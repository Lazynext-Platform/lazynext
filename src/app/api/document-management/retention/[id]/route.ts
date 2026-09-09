import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DocumentManagementService } from '@/lib/services/document-management-service';

/** PATCH /api/document-management/retention/[id] — update a retention policy */
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
    const policy = await DocumentManagementService.updateRetentionPolicy(id, {
      name: body.name,
      category: body.category,
      retentionDays: body.retentionDays,
      action: body.action,
      description: body.description,
    });
    if (!policy) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ policy });
  } catch (e) {
    console.error('[document-management/retention] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_retention_policy' }, { status: 500 });
  }
}

/** DELETE /api/document-management/retention/[id] — delete a retention policy */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const ok = await DocumentManagementService.deleteRetentionPolicy(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[document-management/retention] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_retention_policy' }, { status: 500 });
  }
}
