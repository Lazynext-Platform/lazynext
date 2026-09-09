import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DocumentManagementService } from '@/lib/services/document-management-service';

/** GET /api/document-management/templates — list templates */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ templates: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const category = url.searchParams.get('category') ?? undefined;
  const templates = await DocumentManagementService.listTemplates(organizationId, category ? { category: category as never } : {});
  return NextResponse.json({ templates });
}

/** POST /api/document-management/templates — create a template */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const template = await DocumentManagementService.createTemplate(
      ws.organizationId,
      ws.id,
      {
        name,
        category: body.category,
        description: body.description,
        content: body.content,
        fields: body.fields,
        version: body.version,
      },
      session.user.id,
    );
    return NextResponse.json({ template }, { status: 201 });
  } catch (e) {
    console.error('[document-management/templates] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_template' }, { status: 500 });
  }
}
