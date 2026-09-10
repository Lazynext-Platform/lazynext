import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DocumentManagementService } from '@/lib/services/document-management-service';

/** GET /api/document-management/documents/[id] — get a single document */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const document = await DocumentManagementService.getDocument(id);
  if (!document) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ document });
}

/** PATCH /api/document-management/documents/[id] — update a document */
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
    const document = await DocumentManagementService.updateDocument(id, {
      title: body.title,
      category: body.category,
      content: body.content,
      description: body.description,
      classification: body.classification,
      tags: body.tags,
      changeNote: body.changeNote,
    });
    if (!document) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ document });
  } catch (e) {
    console.error('[document-management/documents] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_document' }, { status: 500 });
  }
}

/** DELETE /api/document-management/documents/[id] — delete a document */
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
    const ok = await DocumentManagementService.deleteDocument(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[document-management/documents] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_document' }, { status: 500 });
  }
}
