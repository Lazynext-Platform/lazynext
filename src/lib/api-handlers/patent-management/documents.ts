import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PatentManagementService } from '@/lib/services/patent-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ documents: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['applicationId', 'type']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const documents = await PatentManagementService.listDocuments(organizationId, opts as never);
  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const applicationId = String(body.applicationId || '').trim();
  const type = String(body.type || '').trim();
  const title = String(body.title || '').trim();
  if (!applicationId || !type || !title) return NextResponse.json({ error: 'applicationId_type_title_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const document = await PatentManagementService.createDocument(ws.organizationId, ws.id, {
      applicationId, type: type as never, title,
      description: body.description, status: body.status,
      fileName: body.fileName, fileUrl: body.fileUrl, filedDate: body.filedDate,
      pageCount: body.pageCount, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ document }, { status: 201 });
  } catch (e) {
    console.error('[patent-management/documents] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_document' }, { status: 500 });
  }
}
