import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DocumentManagementService } from '@/lib/services/document-management-service';

/** GET /api/document-management/documents — list documents */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ documents: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { category?: string; classification?: string; tags?: string[] } = {};
  const category = url.searchParams.get('category');
  const classification = url.searchParams.get('classification');
  const tags = url.searchParams.get('tags');
  if (category) opts.category = category;
  if (classification) opts.classification = classification;
  if (tags) opts.tags = tags.split(',').filter(Boolean);

  const documents = await DocumentManagementService.listDocuments(organizationId, opts as never);
  return NextResponse.json({ documents });
}

/** POST /api/document-management/documents — create a document */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const content = String(body.content ?? '');
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: 'content_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const document = await DocumentManagementService.createDocument(
      ws.organizationId,
      ws.id,
      {
        title,
        content,
        templateId: body.templateId,
        category: body.category,
        description: body.description,
        classification: body.classification,
        tags: body.tags,
      },
      session.user.id,
    );
    return NextResponse.json({ document }, { status: 201 });
  } catch (e) {
    console.error('[document-management/documents] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_document' }, { status: 500 });
  }
}
