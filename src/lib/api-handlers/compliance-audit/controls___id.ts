import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ComplianceAuditService } from '@/lib/services/compliance-audit-service';

/** GET /api/compliance-audit/controls/[id] — get a single control */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const control = await ComplianceAuditService.getControl(id);
  if (!control) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ control });
}

/** PATCH /api/compliance-audit/controls/[id] — update a control */
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
    const control = await ComplianceAuditService.updateControl(id, {
      title: body.title, description: body.description, category: body.category,
      frequency: body.frequency, owner: body.owner, status: body.status,
    });
    if (!control) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ control });
  } catch (e) {
    console.error('[compliance-audit/controls] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_control' }, { status: 500 });
  }
}

/** DELETE /api/compliance-audit/controls/[id] — delete a control */
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
    const ok = await ComplianceAuditService.deleteControl(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[compliance-audit/controls] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_control' }, { status: 500 });
  }
}
