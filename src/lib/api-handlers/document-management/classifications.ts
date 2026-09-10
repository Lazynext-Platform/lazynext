import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DocumentManagementService } from '@/lib/services/document-management-service';

/** GET /api/document-management/classifications — list classification rules */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ classifications: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const classifications = await DocumentManagementService.getClassRules(organizationId);
  return NextResponse.json({ classifications });
}

/** POST /api/document-management/classifications — create a classification rule */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const classification = String(body.classification || '').trim();
  const criteria = String(body.criteria || '').trim();
  if (!name || !classification || !criteria) {
    return NextResponse.json({ error: 'name_classification_criteria_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const rule = await DocumentManagementService.createClassRule(
      ws.organizationId,
      ws.id,
      { name, classification: classification as never, criteria, autoClassify: body.autoClassify },
      session.user.id,
    );
    return NextResponse.json({ classification: rule }, { status: 201 });
  } catch (e) {
    console.error('[document-management/classifications] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_classification' }, { status: 500 });
  }
}
