import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InternalAuditService } from '@/lib/services/internal-audit-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ remediations: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['findingId', 'status', 'owner']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const remediations = await InternalAuditService.listRemediations(organizationId, opts as never);
  return NextResponse.json({ remediations });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const findingId = String(body.findingId || '').trim();
  const action = String(body.action || '').trim();
  if (!findingId || !action) return NextResponse.json({ error: 'findingId_action_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const remediation = await InternalAuditService.createRemediation(ws.organizationId, ws.id, {
      findingId, action,
      description: body.description, owner: body.owner, dueDate: body.dueDate,
      status: body.status, progress: body.progress, completedDate: body.completedDate,
      verifiedBy: body.verifiedBy, verificationDate: body.verificationDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ remediation }, { status: 201 });
  } catch (e) {
    console.error('[internal-audit/remediations] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_remediation' }, { status: 500 });
  }
}
