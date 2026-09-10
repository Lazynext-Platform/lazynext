import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DocumentManagementService } from '@/lib/services/document-management-service';

/** GET /api/document-management/templates/[id] — get a single template */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const template = await DocumentManagementService.getTemplate(id);
  if (!template) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ template });
}

/** PATCH /api/document-management/templates/[id] — update a template */
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
    const template = await DocumentManagementService.updateTemplate(id, {
      name: body.name,
      category: body.category,
      description: body.description,
      content: body.content,
      fields: body.fields,
      version: body.version,
    });
    if (!template) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (e) {
    console.error('[document-management/templates] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_template' }, { status: 500 });
  }
}

/** DELETE /api/document-management/templates/[id] — delete a template */
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
    const ok = await DocumentManagementService.deleteTemplate(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[document-management/templates] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_template' }, { status: 500 });
  }
}
