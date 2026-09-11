import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PublicSitesService } from '@/lib/services/public-sites';
import { safeError } from '@/lib/security';

/**
 * POST /api/sites/publish
 * Publish a document to the public website.
 *
 * Body:
 *  - documentId: the document to publish
 *  - publishSlug: optional URL slug (defaults to slugified title)
 *  - force: if true, bypass the design-quality scan
 *
 * Requires authentication. The user must own or be a member of the workspace.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { documentId, publishSlug, force } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'missing_document_id' }, { status: 400 });
    }

    const result = await PublicSitesService.publishDocument({
      documentId,
      publishSlug,
      force: force === true,
      userId: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error, result }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (e) {
    return NextResponse.json(safeError(e, 'sites/publish', 'publish_failed'), { status: 500 });
  }
}

/**
 * POST /api/sites/unpublish
 * Unpublish a document.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'missing_document_id' }, { status: 400 });
    }

    await PublicSitesService.unpublishDocument(documentId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(safeError(e, 'sites/unpublish', 'unpublish_failed'), { status: 500 });
  }
}
