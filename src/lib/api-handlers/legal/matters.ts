import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LegalMatterService } from '@/lib/services/legal-matter-service';

/** GET /api/legal/matters — list matters */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ matters: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const matters = await LegalMatterService.list(organizationId, {
    type: (sp.get('type') as 'litigation' | 'transaction' | 'compliance' | 'ip' | 'employment' | 'regulatory' | 'other') || undefined,
    status: (sp.get('status') as 'open' | 'in_progress' | 'closed' | 'on_hold') || undefined,
    priority: (sp.get('priority') as 'low' | 'medium' | 'high' | 'urgent') || undefined,
    assignedTo: sp.get('assignedTo') || undefined,
    search: sp.get('search') || undefined,
  });

  return NextResponse.json({ matters });
}

/** POST /api/legal/matters — create a matter */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }
  if (!body.type) {
    return NextResponse.json({ error: 'type_required' }, { status: 400 });
  }
  if (!body.priority) {
    return NextResponse.json({ error: 'priority_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const matter = await LegalMatterService.create(organizationId, {
      title,
      description: body.description,
      type: body.type,
      status: body.status,
      priority: body.priority,
      assignedTo: body.assignedTo,
      opposingParty: body.opposingParty,
      caseNumber: body.caseNumber,
      court: body.court,
      filedDate: body.filedDate,
      closedDate: body.closedDate,
      estimatedCost: body.estimatedCost,
      actualCost: body.actualCost,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ matter }, { status: 201 });
  } catch (e) {
    console.error('[legal/matters] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_matter' }, { status: 500 });
  }
}
