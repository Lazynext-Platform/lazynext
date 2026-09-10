import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmailTemplateService } from '@/lib/services/email-template-service';

/** GET /api/email/templates — list email templates */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ templates: [] });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const search = searchParams.get('search') || undefined;

  const templates = await EmailTemplateService.list(workspaces[0].id, { category, search });
  return NextResponse.json({ templates });
}

/** POST /api/email/templates — create a new email template */
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
    const template = await EmailTemplateService.create({
      workspaceId: ws.id,
      organizationId: ws.organizationId,
      createdBy: session.user.id,
      data: {
        name,
        category: String(body.category || 'general'),
        subject: String(body.subject || ''),
        preheader: body.preheader,
        bodyHtml: String(body.bodyHtml || ''),
        bodyText: body.bodyText,
        variables: body.variables,
        thumbnail: body.thumbnail,
        isDefault: body.isDefault,
      },
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (e) {
    console.error('[email/templates] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_template' }, { status: 500 });
  }
}
