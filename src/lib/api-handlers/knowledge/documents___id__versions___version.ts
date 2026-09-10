import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeService } from '@/lib/services/knowledge-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/knowledge/documents/[id]/versions/[version] — get a specific version.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string; version: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id, version: versionStr } = params;
  const version = parseInt(versionStr, 10);
  if (isNaN(version)) {
    return NextResponse.json({ error: 'invalid_version' }, { status: 400 });
  }

  try {
    const doc = await KnowledgeService.get(id);
    if (!doc) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasOrg = workspaces.some((w) => w.organizationId === doc.organizationId);
    if (!hasOrg) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const versionRecord = await KnowledgeService.getVersion(id, version);
    if (!versionRecord) {
      return NextResponse.json({ error: 'version_not_found' }, { status: 404 });
    }

    return NextResponse.json({ version: versionRecord });
  } catch (e) {
    console.error('[knowledge/documents/versions] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_version' }, { status: 500 });
  }
}

/**
 * POST /api/knowledge/documents/[id]/versions/[version] — restore a version.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string; version: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id, version: versionStr } = params;
  const version = parseInt(versionStr, 10);
  if (isNaN(version)) {
    return NextResponse.json({ error: 'invalid_version' }, { status: 400 });
  }

  try {
    const doc = await KnowledgeService.get(id);
    if (!doc) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasOrg = workspaces.some((w) => w.organizationId === doc.organizationId);
    if (!hasOrg) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const restored = await KnowledgeService.restoreVersion(id, version, session.user.id);
    if (!restored) {
      return NextResponse.json({ error: 'version_not_found' }, { status: 404 });
    }

    return NextResponse.json({ document: restored });
  } catch (e) {
    console.error('[knowledge/documents/versions] restore error:', e);
    return NextResponse.json({ error: 'failed_to_restore_version' }, { status: 500 });
  }
}
