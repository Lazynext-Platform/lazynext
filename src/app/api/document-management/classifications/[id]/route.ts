import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DocumentManagementService } from '@/lib/services/document-management-service';

/** PATCH /api/document-management/classifications/[id] — update a classification rule */
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
    const rule = await DocumentManagementService.updateClassRule(id, {
      name: body.name,
      classification: body.classification,
      criteria: body.criteria,
      autoClassify: body.autoClassify,
    });
    if (!rule) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ classification: rule });
  } catch (e) {
    console.error('[document-management/classifications] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_classification' }, { status: 500 });
  }
}

/** DELETE /api/document-management/classifications/[id] — delete a classification rule */
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
    const ok = await DocumentManagementService.deleteClassRule(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[document-management/classifications] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_classification' }, { status: 500 });
  }
}
