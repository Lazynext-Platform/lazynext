import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ComplianceAuditService } from '@/lib/services/compliance-audit-service';

/** GET /api/compliance-audit/frameworks/[id] — get a single framework */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const framework = await ComplianceAuditService.getFramework(id);
  if (!framework) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ framework });
}

/** PATCH /api/compliance-audit/frameworks/[id] — update a framework */
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
    const framework = await ComplianceAuditService.updateFramework(id, {
      name: body.name, standard: body.standard, description: body.description,
      version: body.version, status: body.status, requirements: body.requirements,
    });
    if (!framework) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ framework });
  } catch (e) {
    console.error('[compliance-audit/frameworks] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_framework' }, { status: 500 });
  }
}

/** DELETE /api/compliance-audit/frameworks/[id] — delete a framework */
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
    const ok = await ComplianceAuditService.deleteFramework(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[compliance-audit/frameworks] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_framework' }, { status: 500 });
  }
}
